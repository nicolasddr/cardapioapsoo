'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast, Toast } from '@/src/components/ui/Toast'

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function validatePassword(password: string): boolean {
  return password.length >= 6
}

export function LoginForm() {
  const toast = useToast()
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({})
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  })

  const handleEmailInput = (e: React.FormEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value
    if (value !== email) {
      setEmail(value)
      setTouched((prev) => ({ ...prev, email: true }))
    }
  }

  const handlePasswordInput = (e: React.FormEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value
    if (value !== password) {
      setPassword(value)
      setTouched((prev) => ({ ...prev, password: true }))
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    setTouched((prev) => ({ ...prev, email: true }))
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: undefined }))
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPassword(value)
    setTouched((prev) => ({ ...prev, password: true }))
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: undefined }))
    }
  }

  const handleEmailBlur = () => {
    setTouched((prev) => ({ ...prev, email: true }))
    if (email && !validateEmail(email)) {
      setErrors((prev) => ({ ...prev, email: 'Email inválido' }))
    }
  }

  const handlePasswordBlur = () => {
    setTouched((prev) => ({ ...prev, password: true }))
    if (password && !validatePassword(password)) {
      setErrors((prev) => ({ ...prev, password: 'Senha deve ter no mínimo 6 caracteres' }))
    }
  }

  // Verificar valores tanto do estado quanto diretamente dos inputs (para autocomplete)
  const emailValue = emailRef.current?.value || email
  const passwordValue = passwordRef.current?.value || password
  const trimmedEmail = emailValue.trim()
  const trimmedPassword = passwordValue.trim()
  const isEmailValid = trimmedEmail.length > 0 && validateEmail(trimmedEmail)
  const isPasswordValid = trimmedPassword.length > 0 && validatePassword(trimmedPassword)
  const isFormValid = isEmailValid && isPasswordValid

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {}

    if (!trimmedEmail) {
      newErrors.email = 'Email é obrigatório'
    } else if (!validateEmail(trimmedEmail)) {
      newErrors.email = 'Email inválido'
    }

    if (!trimmedPassword) {
      newErrors.password = 'Senha é obrigatória'
    } else if (!validatePassword(trimmedPassword)) {
      newErrors.password = 'Senha deve ter no mínimo 6 caracteres'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ email: true, password: true })

    // Verificar valores diretamente dos inputs caso o estado não tenha sido atualizado
    const currentEmail = emailRef.current?.value || email
    const currentPassword = passwordRef.current?.value || password
    
    // Atualizar estado se necessário
    if (currentEmail !== email) {
      setEmail(currentEmail)
    }
    if (currentPassword !== password) {
      setPassword(currentPassword)
    }

    // Usar valores atualizados para validação
    const finalEmail = currentEmail.trim()
    const finalPassword = currentPassword.trim()

    if (!finalEmail || !validateEmail(finalEmail)) {
      setErrors((prev) => ({ ...prev, email: 'Email é obrigatório' }))
      return
    }

    if (!finalPassword || !validatePassword(finalPassword)) {
      setErrors((prev) => ({ ...prev, password: 'Senha é obrigatória' }))
      return
    }

    setLoading(true)
    setErrors({})

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    })

    const loginPromise = async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: finalEmail,
        password: finalPassword,
      })

      if (error) {
        throw error
      }

      return data
    }

    try {
      const data = await Promise.race([loginPromise(), timeoutPromise])

      if (data?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single()

        console.log('Profile fetch:', { profile, profileError })

        if (profile?.role !== 'admin') {
          await supabase.auth.signOut()
          setErrors({
            general: 'Acesso negado. Apenas administradores podem acessar esta área.',
          })
          setLoading(false)
          return
        }

        toast.showToast('Bem-vindo!', `Bem-vindo, ${data.user.email || 'Administrador'}!`)

        // Aguardar um pouco para garantir que os cookies sejam sincronizados
        // Com createBrowserClient do @supabase/ssr, a sincronização é automática
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Verificar novamente antes de redirecionar para evitar loops
        const {
          data: { user: verifiedUser },
        } = await supabase.auth.getUser()

        if (!verifiedUser) {
          setErrors({
            general: 'Erro ao verificar autenticação. Tente novamente.',
          })
          setLoading(false)
          return
        }

        // Obter redirect URL de forma segura
        const redirectParam = typeof window !== 'undefined' 
          ? new URLSearchParams(window.location.search).get('redirect')
          : null
        const redirectUrl = redirectParam || '/admin/dashboard'
        
        // Usar window.location.replace para evitar histórico e garantir redirect completo
        window.location.replace(redirectUrl)
      }
    } catch (error) {
      let errorMessage = 'Erro ao fazer login. Tente novamente.'
      if (error instanceof Error && error.message === 'TIMEOUT') {
        errorMessage = 'Tempo de espera esgotado. Tente novamente.'
      } else if (error && typeof error === 'object' && 'message' in error) {
        const safeError = error as { message?: unknown }
        if (typeof safeError.message === 'string') {
          if (safeError.message.includes('Invalid login credentials')) {
            errorMessage = 'Email ou senha incorretos'
          } else {
            errorMessage = safeError.message
          }
        }
      }
      setErrors({ general: errorMessage })
      setLoading(false)
    }
  }

  // Detectar valores preenchidos automaticamente pelo navegador (autocomplete)
  useEffect(() => {
    // Verificar valores após um pequeno delay para permitir autocomplete
    const timer = setTimeout(() => {
      if (emailRef.current && emailRef.current.value && !email) {
        setEmail(emailRef.current.value)
        setTouched((prev) => ({ ...prev, email: true }))
      }
      if (passwordRef.current && passwordRef.current.value && !password) {
        setPassword(passwordRef.current.value)
        setTouched((prev) => ({ ...prev, password: true }))
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [email, password])

  const showEmailError = touched.email && errors.email
  const showPasswordError = touched.password && errors.password

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            ref={emailRef}
            id="email"
            type="email"
            value={email}
            onChange={handleEmailChange}
            onInput={handleEmailInput}
            onBlur={handleEmailBlur}
            placeholder="seu@email.com"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 ${
              showEmailError
                ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
            }`}
            aria-invalid={!!showEmailError}
            aria-describedby={showEmailError ? 'email-error' : undefined}
            disabled={loading}
            autoComplete="email"
          />
          {showEmailError && (
            <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Senha <span className="text-red-500">*</span>
          </label>
          <input
            ref={passwordRef}
            id="password"
            type="password"
            value={password}
            onChange={handlePasswordChange}
            onInput={handlePasswordInput}
            onBlur={handlePasswordBlur}
            placeholder="••••••"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 ${
              showPasswordError
                ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
            }`}
            aria-invalid={!!showPasswordError}
            aria-describedby={showPasswordError ? 'password-error' : undefined}
            disabled={loading}
            autoComplete="current-password"
          />
          {showPasswordError && (
            <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.password}
            </p>
          )}
        </div>

        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-900">{errors.general}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
              Entrando...
            </span>
          ) : (
            'Entrar'
          )}
        </button>
      </form>
      <Toast
        open={toast.open}
        onOpenChange={toast.onOpenChange}
        title={toast.title}
        description={toast.description}
      />
    </>
  )
}

