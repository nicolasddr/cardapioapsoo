import { validateStoreSettingsInput } from '@/src/domain/entities/StoreConfig'

describe('validateStoreSettingsInput', () => {
  it('returns no errors for valid payload', () => {
    const errors = validateStoreSettingsInput('Restaurante', '', '', {})
    expect(errors).toEqual({})
  })

  it('validates required and length constraints', () => {
    const errors = validateStoreSettingsInput('A', 'a'.repeat(501), 'b'.repeat(121), {})
    expect(errors.name).toBeDefined()
    expect(errors.description).toBeDefined()
    expect(errors.openingHours).toBeDefined()
  })

  it('validates logo file size and type', () => {
    const bigFile = { size: 2 * 1024 * 1024, type: 'image/png' } as File
    const wrongType = { size: 1000, type: 'image/gif' } as File

    const sizeErrors = validateStoreSettingsInput('Restaurante', '', '', { logo: bigFile })
    expect(sizeErrors.logo).toBeDefined()

    const typeErrors = validateStoreSettingsInput('Restaurante', '', '', { logo: wrongType })
    expect(typeErrors.logo).toBeDefined()
  })

  it('validates cover file size and type', () => {
    const bigFile = { size: 3 * 1024 * 1024, type: 'image/png' } as File
    const wrongType = { size: 1000, type: 'application/pdf' } as File

    const sizeErrors = validateStoreSettingsInput('Restaurante', '', '', { cover: bigFile })
    expect(sizeErrors.cover).toBeDefined()

    const typeErrors = validateStoreSettingsInput('Restaurante', '', '', { cover: wrongType })
    expect(typeErrors.cover).toBeDefined()
  })
})
