import { parsePhoneNumberFromString } from 'libphonenumber-js'

// El celular en formato internacional (E.164), que es como lo guarda la base: +5491158749895.
// Sin código de país se toma Argentina. Un celular argentino lleva el 9 después del 54: se agrega
// cuando falta, porque "11 5874-9895" se lee igual que un fijo. Los extranjeros quedan como vienen.
export function normalizePhone(phone: string) {
  const parsed = parsePhoneNumberFromString(phone, 'AR')

  if (!parsed?.isValid()) {
    return null
  }

  if (parsed.country === 'AR' && !parsed.number.startsWith('+549')) {
    return `+549${parsed.nationalNumber}`
  }

  return parsed.number
}

export const validPhone = (phone: string) => normalizePhone(phone) !== null

// Para mostrarlo como va a quedar: +54 9 11 5874 9895.
export function formatPhone(phone: string) {
  const normalized = normalizePhone(phone)

  return normalized
    ? (parsePhoneNumberFromString(normalized)?.formatInternational() ??
        normalized)
    : phone
}
