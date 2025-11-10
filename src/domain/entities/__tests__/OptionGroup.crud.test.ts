import {
  OptionGroup,
  OptionGroupValidationError,
  validateOptionGroupInput,
  type CreateOptionGroupPayload,
  type UpdateOptionGroupPayload,
} from '../OptionGroup'

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}))

describe('OptionGroup CRUD', () => {
  describe('validateOptionGroupInput', () => {
    it('deve validar nome obrigatório', () => {
      const errors = validateOptionGroupInput('', 'single')
      expect(errors.name).toBe('Nome é obrigatório')
    })

    it('deve validar tamanho mínimo do nome', () => {
      const errors = validateOptionGroupInput('ab', 'single')
      expect(errors.name).toBe('Nome deve ter entre 3 e 40 caracteres')
    })

    it('deve validar tamanho máximo do nome', () => {
      const nome = 'a'.repeat(41)
      const errors = validateOptionGroupInput(nome, 'single')
      expect(errors.name).toBe('Nome deve ter entre 3 e 40 caracteres')
    })

    it('deve validar tipo de seleção', () => {
      const errors = validateOptionGroupInput('Nome válido', 'invalid' as any)
      expect(errors.selectionType).toBe('Tipo de seleção deve ser "single" ou "multiple"')
    })

    it('não deve retornar erros para dados válidos', () => {
      const errors = validateOptionGroupInput('Adicionais', 'single')
      expect(Object.keys(errors).length).toBe(0)
    })
  })

  describe('OptionGroupValidationError', () => {
    it('deve criar erro com fieldErrors', () => {
      const fieldErrors = { name: 'Nome inválido' }
      const error = new OptionGroupValidationError(fieldErrors)
      
      expect(error.name).toBe('OptionGroupValidationError')
      expect(error.message).toBe('Option group validation failed')
      expect(error.fieldErrors).toEqual(fieldErrors)
    })
  })

  describe('OptionGroup instance methods', () => {
    const group = new OptionGroup(
      'group-1',
      'Adicionais',
      'single',
      new Date('2024-01-01'),
      new Date('2024-01-01')
    )

    it('deve retornar nome', () => {
      expect(group.getName()).toBe('Adicionais')
    })

    it('deve retornar tipo de seleção', () => {
      expect(group.getSelectionType()).toBe('single')
    })
  })
})

