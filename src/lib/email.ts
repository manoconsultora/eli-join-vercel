// Misma regla en el formulario y en el submit, para que el paso del email no deje pasar lo que el servidor rechaza.
export const validEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
