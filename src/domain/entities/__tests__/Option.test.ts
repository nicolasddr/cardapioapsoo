import { Option } from '../Option'

describe('Option', () => {
  const option = new Option(
    'test-id',
    'Bacon',
    2.5,
    'group-id',
    new Date(),
    new Date()
  )

  describe('getName()', () => {
    it('should return the option name', () => {
      expect(option.getName()).toBe('Bacon')
    })
  })

  describe('getAdditionalPrice()', () => {
    it('should return the additional price', () => {
      expect(option.getAdditionalPrice()).toBe(2.5)
    })
  })

  describe('getDisplayPrice()', () => {
    it('should return "Grátis" when price is 0', () => {
      const freeOption = new Option(
        'free-id',
        'Grátis',
        0,
        'group-id',
        new Date(),
        new Date()
      )
      expect(freeOption.getDisplayPrice()).toBe('Grátis')
    })

    it('should return formatted price with + when price > 0', () => {
      expect(option.getDisplayPrice()).toMatch(/\+R\$\s2,50/)
    })
  })
})

