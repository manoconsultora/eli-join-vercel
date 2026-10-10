import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { validEmail } from '@/lib/email'
import { validPhone } from '@/lib/phone'

export type Unit = {
  id: string
  label: string
}

type Relationship = {
  label: string
  value: string
}

// Índices en STEPS (joinSteps.tsx).
const EMAIL_STEP = 3
const VERIFY_STEP = 4
const REVIEW_STEP = 8
const SENT_STEP = 9
const ALREADY_PENDING_STEP = 10

// La base admite un código nuevo por minuto (eli-database-platform 20261010200000).
const RESEND_DELAY_MS = 60_000

export type JoinData = {
  consorcio: {
    address: string | null
    name: string
  }
  relationships: Relationship[]
  units: Unit[]
}

// También cubre INTERNAL_ERROR y cualquier código nuevo: el vecino nunca ve el código crudo.
const SUBMIT_ERROR =
  'No pudimos enviar tu solicitud. Probá de nuevo en unos minutos.'

const INACTIVE_LINK_ERROR =
  'Este link ya no está activo. Pedile uno nuevo a la administración del edificio.'

// Códigos de submit/route.ts y lib/joinLink.ts. ALREADY_PENDING no está: tiene su propio paso.
const SUBMIT_ERRORS: Record<string, string> = {
  // Doesn't say the contact is blocked: the administration explains it if needed.
  CONTACT_BLOCKED:
    'No pudimos registrar tu solicitud. Comunicate con la administración del edificio.',
  EMAIL_NOT_VERIFIED:
    'Necesitamos verificar tu email de nuevo. Tocá "Cambiar" en Email.',
  INVALID_TOKEN: INACTIVE_LINK_ERROR,
  TOKEN_INACTIVE: INACTIVE_LINK_ERROR,
  UNIT_LIMIT_REACHED:
    'Esa unidad ya tiene el máximo de residentes. Comunicate con la administración del edificio.',
  UNIT_NOT_FOUND: 'No encontramos esa unidad. Elegila de nuevo.',
  VALIDATION_ERROR: 'Revisá tus datos y volvé a intentar.',
}

const SEND_CODE_ERROR =
  'No pudimos mandarte el código. Probá de nuevo en unos minutos.'

// Códigos de email-code/route.ts.
const SEND_CODE_ERRORS: Record<string, string> = {
  CODE_RECENTLY_SENT:
    'Ya te mandamos un código hace instantes. Esperá un minuto para pedir otro.',
  INVALID_TOKEN: INACTIVE_LINK_ERROR,
  TOKEN_INACTIVE: INACTIVE_LINK_ERROR,
  TOO_MANY_CODES: 'Pediste muchos códigos. Probá de nuevo en una hora.',
}

const CODE_EXPIRED = 'El código venció. Pedí uno nuevo.'

// Respuestas de email-code/verify/route.ts que no verifican.
const VERIFY_CODE_ERRORS: Record<string, string> = {
  expired: CODE_EXPIRED,
  invalid_code: 'El código no es correcto. Revisalo y probá de nuevo.',
  not_found: CODE_EXPIRED,
  too_many_attempts: 'Superaste los intentos. Pedí un código nuevo.',
}

const normalizeEmail = (value: string) => value.trim().toLowerCase()

const validCode = (value: string) => /^\d{6}$/.test(value)

export function useJoinForm({
  data,
  token,
}: {
  data: JoinData
  token: string
}) {
  const [step, setStep] = useState(0)
  // true mientras el vecino corrige un dato desde la revisión: al continuar vuelve ahí.
  const [editing, setEditing] = useState(false)
  const [transitioning, setTransitioning] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  const [unitSearch, setUnitSearch] = useState('')
  const [unitId, setUnitId] = useState('')

  const [relationship, setRelationship] = useState<string | null>(null)

  // El código va al email de codeEmail; verifiedEmail es el que ya se verificó.
  const [code, setCode] = useState('')
  const [codeEmail, setCodeEmail] = useState<string | null>(null)
  const [verificationId, setVerificationId] = useState<string | null>(null)
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [codeBusy, setCodeBusy] = useState(false)
  const [resendAt, setResendAt] = useState(0)
  const [clock, setClock] = useState(0)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  // El paso solo cambia cuando el vecino avanza, así que el foco nunca salta al cargar:
  // el paso 0 no tiene campo. El campo se nombra con el título del paso (aria-labelledby).
  useEffect(
    function focusStepInput() {
      inputRef.current?.focus()
    },
    [step],
  )

  // La cuenta regresiva de "Reenviar código" solo corre en el paso del código.
  useEffect(
    function tickResendClock() {
      setClock(Date.now())
      const interval =
        step === VERIFY_STEP
          ? window.setInterval(() => setClock(Date.now()), 1000)
          : undefined
      return () => window.clearInterval(interval)
    },
    [step],
  )

  const filteredUnits = useMemo(
    function filterUnits() {
      const search = unitSearch.trim().toLowerCase()

      if (!search) {
        return data.units
      }

      return data.units.filter(unit =>
        unit.label.toLowerCase().includes(search),
      )
    },
    [data, unitSearch],
  )

  const selectedUnit = data.units.find(unit => unit.id === unitId)

  const emailValid = validEmail(normalizeEmail(email))

  const resendSeconds = Math.max(0, Math.ceil((resendAt - clock) / 1000))

  const phoneValid = validPhone(phone.trim())

  function goTo(target: number) {
    if (transitioning) {
      return
    }

    setTransitioning(true)

    window.setTimeout(function changeStep() {
      setStep(target)
      setEditing(editingStep => editingStep && target !== REVIEW_STEP)
      setTransitioning(false)
    }, 240)
  }

  function next() {
    goTo(editing ? REVIEW_STEP : step + 1)
  }

  function editStep(target: number) {
    setSubmitError(null)
    setEditing(true)
    goTo(target)
  }

  function handleEnter(event: KeyboardEvent<HTMLInputElement>, value: string) {
    if (event.key === 'Enter' && value.trim()) {
      event.preventDefault()
      next()
    }
  }

  async function requestCode(target: string) {
    try {
      const response = await fetch(
        `/api/join/${encodeURIComponent(token)}/email-code`,
        {
          body: JSON.stringify({ email: target }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        },
      )
      const result = (await response.json()) as {
        code?: string
        verificationId?: string
      }

      if (!response.ok || !result.verificationId) {
        setCodeError(SEND_CODE_ERRORS[result.code ?? ''] ?? SEND_CODE_ERROR)
        return false
      }

      setVerificationId(result.verificationId)
      setCodeEmail(target)
      setCode('')
      setResendAt(Date.now() + RESEND_DELAY_MS)
      return true
    } catch {
      setCodeError(SEND_CODE_ERROR)
      return false
    }
  }

  // Un email ya verificado no pide otro código; uno con código en curso vuelve a ese código.
  async function continueFromEmail() {
    const target = normalizeEmail(email)

    if (!validEmail(target) || codeBusy) {
      return
    }

    setCodeError(null)

    if (target === verifiedEmail) {
      goTo(editing ? REVIEW_STEP : VERIFY_STEP + 1)
      return
    }

    if (target === codeEmail && verificationId) {
      goTo(VERIFY_STEP)
      return
    }

    setCodeBusy(true)
    const sent = await requestCode(target)
    setCodeBusy(false)

    if (sent) {
      goTo(VERIFY_STEP)
    }
  }

  async function resendCode() {
    if (!codeEmail || codeBusy || resendSeconds > 0) {
      return
    }

    setCodeError(null)
    setCodeBusy(true)
    await requestCode(codeEmail)
    setCodeBusy(false)
  }

  async function verifyCode() {
    if (!verificationId || !validCode(code) || codeBusy) {
      return
    }

    setCodeError(null)
    setCodeBusy(true)

    try {
      const response = await fetch(
        `/api/join/${encodeURIComponent(token)}/email-code/verify`,
        {
          body: JSON.stringify({ code, verificationId }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        },
      )
      const result = (await response.json()) as { status?: string }

      if (result.status === 'verified') {
        setVerifiedEmail(codeEmail)
        next()
        return
      }

      setCodeError(VERIFY_CODE_ERRORS[result.status ?? ''] ?? SEND_CODE_ERROR)
    } catch {
      setCodeError(SEND_CODE_ERROR)
    } finally {
      setCodeBusy(false)
    }
  }

  function changeEmail() {
    setCodeError(null)
    goTo(EMAIL_STEP)
  }

  function handleEmailKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void continueFromEmail()
    }
  }

  function handleCodeKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void verifyCode()
    }
  }

  function handleCodeChange(value: string) {
    setCode(value.replace(/\D/g, '').slice(0, 6))
  }

  function handleUnitSearchChange(event: ChangeEvent<HTMLInputElement>) {
    setUnitSearch(event.target.value)
    setUnitId('')
  }

  function selectUnit(unit: Unit) {
    setUnitId(unit.id)
    setUnitSearch(unit.label)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()

    if (!unitId || !relationship) {
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch(
        `/api/join/${encodeURIComponent(token)}/submit`,
        {
          body: JSON.stringify({
            email,
            emailVerificationId: verificationId,
            firstName,
            lastName,
            phone,
            relationshipType: relationship,
            unitId,
          }),
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
        },
      )

      const result = (await response.json()) as { code?: string }

      if (!response.ok) {
        if (result.code === 'ALREADY_PENDING') {
          setStep(ALREADY_PENDING_STEP)
          return
        }

        // Venció o ya se usó: el próximo "Continuar" en Email pide otro código.
        if (result.code === 'EMAIL_NOT_VERIFIED') {
          setVerifiedEmail(null)
          setVerificationId(null)
          setCodeEmail(null)
        }

        setSubmitError(SUBMIT_ERRORS[result.code ?? ''] ?? SUBMIT_ERROR)
        return
      }

      setStep(SENT_STEP)
    } catch {
      setSubmitError(SUBMIT_ERROR)
    } finally {
      setSubmitting(false)
    }
  }

  return {
    changeEmail,
    code,
    codeBusy,
    codeEmail,
    codeError,
    continueFromEmail,
    data,
    editStep,
    email,
    emailValid,
    filteredUnits,
    firstName,
    handleCodeChange,
    handleCodeKeyDown,
    handleEmailKeyDown,
    handleEnter,
    handleUnitSearchChange,
    inputRef,
    lastName,
    next,
    phone,
    phoneValid,
    relationship,
    resendCode,
    resendSeconds,
    selectedUnit,
    selectUnit,
    setEmail,
    setFirstName,
    setLastName,
    setPhone,
    setRelationship,
    step,
    submit,
    submitError,
    submitting,
    transitioning,
    unitId,
    unitSearch,
    validCode: validCode(code),
    verifyCode,
  }
}

export type JoinFormState = ReturnType<typeof useJoinForm>
