'use client'

import * as ToastPrimitive from '@radix-ui/react-toast'
import { useState, useEffect } from 'react'

interface ToastProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
}

export function Toast({ open, onOpenChange, title, description }: ToastProps) {
  return (
    <ToastPrimitive.Provider>
      <ToastPrimitive.Root
        open={open}
        onOpenChange={onOpenChange}
        className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 pointer-events-auto data-[state=open]:animate-slideIn data-[state=closed]:animate-slideOut"
      >
        <ToastPrimitive.Title className="font-semibold text-gray-900">
          {title}
        </ToastPrimitive.Title>
        {description && (
          <ToastPrimitive.Description className="text-sm text-gray-600 mt-1">
            {description}
          </ToastPrimitive.Description>
        )}
      </ToastPrimitive.Root>
      <ToastPrimitive.Viewport className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-full p-4 pointer-events-none" />
    </ToastPrimitive.Provider>
  )
}

export function useToast() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState<string | undefined>(undefined)

  const showToast = (toastTitle: string, toastDescription?: string) => {
    setTitle(toastTitle)
    setDescription(toastDescription)
    setOpen(true)
  }

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setOpen(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [open])

  return {
    open,
    onOpenChange: setOpen,
    title,
    description,
    showToast,
  }
}

