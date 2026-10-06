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

// Índice del paso de revisión en STEPS (joinSteps.tsx).
const REVIEW_STEP = 7

export type JoinData = {
  consorcio: {
    address: string | null
    name: string
  }
  relationships: Relationship[]
  units: Unit[]
}

const SUBMIT_ERROR = 'No pudimos enviar tu solicitud.'
// Doesn't say the contact is blocked: the administration explains it if needed.
const CONTACT_BLOCKED_ERROR =
  'No pudimos registrar tu solicitud. Comunicate con la administración del edificio.'

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

  const emailValid = validEmail(email.trim().toLowerCase())

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
          setStep(9)
          return
        }

        if (result.code === 'CONTACT_BLOCKED') {
          setSubmitError(CONTACT_BLOCKED_ERROR)
          return
        }

        setSubmitError(result.code ?? SUBMIT_ERROR)
        return
      }

      setStep(8)
    } catch {
      setSubmitError(SUBMIT_ERROR)
    } finally {
      setSubmitting(false)
    }
  }

  return {
    data,
    editStep,
    email,
    emailValid,
    filteredUnits,
    firstName,
    handleEnter,
    handleUnitSearchChange,
    inputRef,
    lastName,
    next,
    phone,
    phoneValid,
    relationship,
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
  }
}

export type JoinFormState = ReturnType<typeof useJoinForm>
