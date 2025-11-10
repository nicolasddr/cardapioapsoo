import { Product } from '../Product'
import { OptionGroup } from '../OptionGroup'

// Mock OptionGroup
jest.mock('../OptionGroup', () => ({
  OptionGroup: {
    getByProductId: jest.fn().mockResolvedValue([]),
  },
}))

describe('Product', () => {
  const product = new Product(
    'test-id',
    'Hambúrguer',
    25.9,
    'category-id',
    'Ativo',
    0,
    new Date(),
    new Date(),
    'Delicioso hambúrguer artesanal',
    'https://example.com/photo.jpg'
  )

  describe('isActive()', () => {
    it('should return true when status is "Ativo"', () => {
      expect(product.isActive()).toBe(true)
    })

    it('should return false when status is "Inativo"', () => {
      const inactiveProduct = new Product(
        'test-id-2',
        'Produto',
        10,
        'category-id',
        'Inativo',
        0,
        new Date(),
        new Date()
      )
      expect(inactiveProduct.isActive()).toBe(false)
    })
  })

  describe('getDisplayPrice()', () => {
    it('should return formatted price in BRL', () => {
      expect(product.getDisplayPrice()).toMatch(/R\$\s25,90/)
    })
  })

  describe('getOptionGroups()', () => {
    it('should fetch option groups from OptionGroup', async () => {
      const groups = await product.getOptionGroups()
      expect(OptionGroup.getByProductId).toHaveBeenCalledWith('test-id')
      expect(Array.isArray(groups)).toBe(true)
    })
  })
})

