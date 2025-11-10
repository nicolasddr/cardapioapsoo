import { cartItemsMatch, generateCartItemId } from '../cart'
import { CartItem } from '../cart'

describe('Cart Utilities', () => {
  describe('generateCartItemId()', () => {
    it('should generate unique IDs', () => {
      const id1 = generateCartItemId()
      const id2 = generateCartItemId()
      expect(id1).not.toBe(id2)
    })

    it('should generate string IDs', () => {
      const id = generateCartItemId()
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(0)
    })
  })

  describe('cartItemsMatch()', () => {
    const baseItem: Omit<CartItem, 'id' | 'totalPrice'> = {
      productId: 'prod-1',
      productName: 'Hambúrguer',
      productPrice: 25.9,
      quantity: 1,
      selectedOptions: [
        {
          optionGroupId: 'group-1',
          optionGroupName: 'Tamanho',
          optionId: 'opt-1',
          optionName: 'Médio',
          additionalPrice: 3.0,
        },
      ],
      notes: 'Sem cebola',
    }

    it('should match identical items', () => {
      expect(cartItemsMatch(baseItem, baseItem)).toBe(true)
    })

    it('should not match items with different productId', () => {
      const item2 = { ...baseItem, productId: 'prod-2' }
      expect(cartItemsMatch(baseItem, item2)).toBe(false)
    })

    it('should not match items with different notes', () => {
      const item2 = { ...baseItem, notes: 'Com cebola' }
      expect(cartItemsMatch(baseItem, item2)).toBe(false)
    })

    it('should not match items with different options', () => {
      const item2 = {
        ...baseItem,
        selectedOptions: [
          {
            optionGroupId: 'group-1',
            optionGroupName: 'Tamanho',
            optionId: 'opt-2',
            optionName: 'Grande',
            additionalPrice: 6.0,
          },
        ],
      }
      expect(cartItemsMatch(baseItem, item2)).toBe(false)
    })

    it('should match items with same options in different order', () => {
      const item1 = {
        ...baseItem,
        selectedOptions: [
          {
            optionGroupId: 'group-1',
            optionGroupName: 'Tamanho',
            optionId: 'opt-1',
            optionName: 'Médio',
            additionalPrice: 3.0,
          },
          {
            optionGroupId: 'group-2',
            optionGroupName: 'Adicionais',
            optionId: 'opt-3',
            optionName: 'Bacon',
            additionalPrice: 2.5,
          },
        ],
      }
      const item2 = {
        ...baseItem,
        selectedOptions: [
          {
            optionGroupId: 'group-2',
            optionGroupName: 'Adicionais',
            optionId: 'opt-3',
            optionName: 'Bacon',
            additionalPrice: 2.5,
          },
          {
            optionGroupId: 'group-1',
            optionGroupName: 'Tamanho',
            optionId: 'opt-1',
            optionName: 'Médio',
            additionalPrice: 3.0,
          },
        ],
      }
      expect(cartItemsMatch(item1, item2)).toBe(true)
    })
  })
})

