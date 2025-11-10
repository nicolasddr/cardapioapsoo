export interface CartItemOption {
  optionGroupId: string
  optionGroupName: string
  optionId: string
  optionName: string
  additionalPrice: number
}

export interface CartItem {
  id: string
  productId: string
  productName: string
  productPrice: number
  quantity: number
  selectedOptions: CartItemOption[]
  notes: string
  totalPrice: number
}

export interface AppliedCoupon {
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  discountAmount: number
}

export function generateCartItemId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function cartItemsMatch(
  item1: Omit<CartItem, 'id' | 'totalPrice'>,
  item2: Omit<CartItem, 'id' | 'totalPrice'>
): boolean {
  if (item1.productId !== item2.productId) return false
  if (item1.notes !== item2.notes) return false
  if (item1.selectedOptions.length !== item2.selectedOptions.length) return false

  const sortedOptions1 = [...item1.selectedOptions].sort((a, b) =>
    a.optionId.localeCompare(b.optionId)
  )
  const sortedOptions2 = [...item2.selectedOptions].sort((a, b) =>
    a.optionId.localeCompare(b.optionId)
  )

  return sortedOptions1.every(
    (opt1, index) =>
      opt1.optionId === sortedOptions2[index].optionId &&
      opt1.additionalPrice === sortedOptions2[index].additionalPrice
  )
}

