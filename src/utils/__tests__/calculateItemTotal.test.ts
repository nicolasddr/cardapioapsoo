// Função extraída para testes
function calculateItemTotal(
  productPrice: number,
  selectedOptions: Array<{ additionalPrice: number }>,
  quantity: number
): number {
  const optionsTotal = selectedOptions.reduce(
    (sum, option) => sum + option.additionalPrice,
    0
  )
  return (productPrice + optionsTotal) * quantity
}

describe('calculateItemTotal', () => {
  it('should calculate total for product without options', () => {
    const total = calculateItemTotal(25.9, [], 1)
    expect(total).toBe(25.9)
  })

  it('should calculate total with single option', () => {
    const total = calculateItemTotal(25.9, [{ additionalPrice: 3.0 }], 1)
    expect(total).toBe(28.9)
  })

  it('should calculate total with multiple options', () => {
    const total = calculateItemTotal(
      25.9,
      [
        { additionalPrice: 3.0 },
        { additionalPrice: 2.5 },
        { additionalPrice: 1.5 },
      ],
      1
    )
    expect(total).toBe(32.9)
  })

  it('should multiply by quantity', () => {
    const total = calculateItemTotal(25.9, [{ additionalPrice: 3.0 }], 2)
    expect(total).toBe(57.8)
  })

  it('should handle zero price options', () => {
    const total = calculateItemTotal(25.9, [{ additionalPrice: 0 }], 1)
    expect(total).toBe(25.9)
  })

  it('should handle zero product price', () => {
    const total = calculateItemTotal(0, [{ additionalPrice: 3.0 }], 1)
    expect(total).toBe(3.0)
  })
})

