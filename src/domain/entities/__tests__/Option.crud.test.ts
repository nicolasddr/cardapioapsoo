import {
  Option,
  OptionValidationError,
  validateOptionInput,
  type CreateOptionPayload,
  type UpdateOptionPayload,
} from '../Option'

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}))

describe('Option CRUD', () => {
  describe('validateOptionInput', () => {
    it('deve validar nome obrigatório', () => {
      const errors = validateOptionInput('', 5.0, 'group-1')
      expect(errors.name).toBe('Nome é obrigatório')
    })

    it('deve validar tamanho mínimo do nome', () => {
      const errors = validateOptionInput('ab', 5.0, 'group-1')
      expect(errors.name).toBe('Nome deve ter entre 3 e 60 caracteres')
    })

    it('deve validar tamanho máximo do nome', () => {
      const nome = 'a'.repeat(61)
      const errors = validateOptionInput(nome, 5.0, 'group-1')
      expect(errors.name).toBe('Nome deve ter entre 3 e 60 caracteres')
    })

    it('deve validar preço adicional negativo', () => {
      const errors = validateOptionInput('Bacon', -5.0, 'group-1')
      expect(errors.additionalPrice).toBe('Preço adicional não pode ser negativo')
    })

    it('deve validar grupo obrigatório', () => {
      const errors = validateOptionInput('Bacon', 5.0, '')
      expect(errors.optionGroupId).toBe('Grupo de opcionais é obrigatório')
    })

    it('deve aceitar preço zero', () => {
      const errors = validateOptionInput('Sem custo', 0, 'group-1')
      expect(Object.keys(errors).length).toBe(0)
    })

    it('não deve retornar erros para dados válidos', () => {
      const errors = validateOptionInput('Bacon Extra', 5.0, 'group-1')
      expect(Object.keys(errors).length).toBe(0)
    })
  })

  describe('OptionValidationError', () => {
    it('deve criar erro com fieldErrors', () => {
      const fieldErrors = { name: 'Nome inválido' }
      const error = new OptionValidationError(fieldErrors)
      
      expect(error.name).toBe('OptionValidationError')
      expect(error.message).toBe('Option validation failed')
      expect(error.fieldErrors).toEqual(fieldErrors)
    })
  })

  describe('Option instance methods', () => {
    const option = new Option(
      'option-1',
      'Bacon Extra',
      5.0,
      'group-1',
      new Date('2024-01-01'),
      new Date('2024-01-01'),
      null
    )

    const optionZeroPrice = new Option(
      'option-2',
      'Sem custo',
      0,
      'group-1',
      new Date('2024-01-01'),
      new Date('2024-01-01'),
      null
    )

    const optionDeleted = new Option(
      'option-3',
      'Deleted',
      5.0,
      'group-1',
      new Date('2024-01-01'),
      new Date('2024-01-01'),
      new Date('2024-01-02')
    )

    it('deve retornar nome', () => {
      expect(option.getName()).toBe('Bacon Extra')
    })

    it('deve retornar preço adicional', () => {
      expect(option.getAdditionalPrice()).toBe(5.0)
    })

    it('deve retornar display price formatado', () => {
      expect(option.getDisplayPrice()).toContain('R$')
      expect(option.getDisplayPrice()).toContain('5,00')
    })

    it('deve retornar "Sem custo adicional" para preço zero', () => {
      expect(optionZeroPrice.getDisplayPrice()).toBe('Sem custo adicional')
    })

    it('deve identificar opcional não deletado', () => {
      expect(option.isDeleted()).toBe(false)
    })

    it('deve identificar opcional deletado', () => {
      expect(optionDeleted.isDeleted()).toBe(true)
    })
  })
})

