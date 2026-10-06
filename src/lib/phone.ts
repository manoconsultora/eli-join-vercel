// Misma regla en el formulario y en el submit: dígitos con separadores comunes y largo de un número real (E.164: hasta 15).
export function validPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')

  return (
    /^[\d\s()+-]+$/.test(phone) && digits.length >= 8 && digits.length <= 15
  )
}
