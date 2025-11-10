import { validateCategoryInput } from '@/src/domain/entities/Category'

describe('validateCategoryInput', () => {
  it('returns no errors for valid name', () => {
    const errors = validateCategoryInput('Bebidas')
    expect(errors).toEqual({})
  })

  it('validates required name', () => {
    const errors = validateCategoryInput('')
    expect(errors.name).toBe('Nome é obrigatório')
  })

  it('validates minimum length', () => {
    const errors = validateCategoryInput('AB')
    expect(errors.name).toBe('Nome deve ter entre 3 e 40 caracteres')
  })

  it('validates maximum length', () => {
    const errors = validateCategoryInput('A'.repeat(41))
    expect(errors.name).toBe('Nome deve ter entre 3 e 40 caracteres')
  })

  it('accepts valid length range', () => {
    const errors3 = validateCategoryInput('ABC')
    expect(errors3).toEqual({})

    const errors40 = validateCategoryInput('A'.repeat(40))
    expect(errors40).toEqual({})
  })
})

