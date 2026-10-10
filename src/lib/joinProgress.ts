// El avance del formulario vive solo en este navegador, para retomarlo si el vecino cierra la
// página o pierde el mail del código. Nunca guarda el código. Se borra al enviar, al empezar
// de nuevo o a las 24 horas sin cambios.
const TTL_MS = 24 * 60 * 60 * 1000

export type JoinProgress = {
  codeEmail: string | null
  email: string
  firstName: string
  lastName: string
  phone: string
  relationship: string | null
  step: number
  unitId: string
  verificationId: string | null
  verifiedEmail: string | null
}

const keyFor = (token: string) => `eli-join:${token}`

// Sin acceso al almacenamiento (modo privado, bloqueado) el formulario funciona igual, sin retomar.
export function readProgress(token: string) {
  try {
    const raw = window.localStorage.getItem(keyFor(token))
    if (!raw) {
      return null
    }

    const saved = JSON.parse(raw) as JoinProgress & { savedAt: number }
    if (Date.now() - saved.savedAt > TTL_MS) {
      window.localStorage.removeItem(keyFor(token))
      return null
    }

    return saved
  } catch {
    return null
  }
}

export function saveProgress(token: string, progress: JoinProgress) {
  try {
    window.localStorage.setItem(
      keyFor(token),
      JSON.stringify({ ...progress, savedAt: Date.now() }),
    )
  } catch {
    // Sin almacenamiento no se retoma; el formulario sigue igual.
  }
}

export function clearProgress(token: string) {
  try {
    window.localStorage.removeItem(keyFor(token))
  } catch {
    // Nada guardado que borrar.
  }
}
