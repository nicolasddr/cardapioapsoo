export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '')
  
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
  } else {
    return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
  }
}

export function validatePhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 11
}

