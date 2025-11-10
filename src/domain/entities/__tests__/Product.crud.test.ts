import { validateProductInput } from '@/src/domain/entities/Product'

describe('validateProductInput', () => {
  it('returns no errors for valid product', () => {
    const errors = validateProductInput('Pizza Margherita', 'Deliciosa pizza', 25.90, 'cat-id', {})
    expect(errors).toEqual({})
  })

  it('validates required name', () => {
    const errors = validateProductInput('', '', 10, 'cat-id', {})
    expect(errors.name).toBe('Nome é obrigatório')
  })

  it('validates name length', () => {
    const errorsMin = validateProductInput('AB', '', 10, 'cat-id', {})
    expect(errorsMin.name).toBe('Nome deve ter entre 3 e 60 caracteres')

    const errorsMax = validateProductInput('A'.repeat(61), '', 10, 'cat-id', {})
    expect(errorsMax.name).toBe('Nome deve ter entre 3 e 60 caracteres')
  })

  it('validates description length', () => {
    const errors = validateProductInput('Produto', 'A'.repeat(501), 10, 'cat-id', {})
    expect(errors.description).toBe('Descrição deve ter no máximo 500 caracteres')
  })

  it('validates price minimum', () => {
    const errors = validateProductInput('Produto', '', -1, 'cat-id', {})
    expect(errors.price).toBe('Preço deve ser maior ou igual a zero')
  })

  it('validates required categoryId', () => {
    const errors = validateProductInput('Produto', '', 10, '', {})
    expect(errors.categoryId).toBe('Categoria é obrigatória')
  })

  it('validates photo file type', () => {
    const wrongType = { size: 1000, type: 'application/pdf' } as File
    const errors = validateProductInput('Produto', '', 10, 'cat-id', { photo: wrongType })
    expect(errors.photo).toBe('Foto deve ser PNG, JPG ou WebP')
  })

  it('validates photo file size', () => {
    const bigFile = { size: 3 * 1024 * 1024, type: 'image/png' } as File
    const errors = validateProductInput('Produto', '', 10, 'cat-id', { photo: bigFile })
    expect(errors.photo).toBe('Foto deve ter no máximo 2 MB')
  })

  it('accepts valid photo', () => {
    const validFile = { size: 1 * 1024 * 1024, type: 'image/png' } as File
    const errors = validateProductInput('Produto', '', 10, 'cat-id', { photo: validFile })
    expect(errors).toEqual({})
  })
})

