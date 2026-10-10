import { NextResponse } from 'next/server'

import { validEmail } from '@/lib/email'
import {
  errorResponse,
  findActiveJoinLink,
  type JoinLink,
} from '@/lib/joinLink'
import { validPhone } from '@/lib/phone'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const MAX_ACTIVE_RESIDENTS_PER_UNIT = 5

type SubmitBody = {
  email?: string
  emailVerificationId?: string
  firstName?: string
  lastName?: string
  phone?: string
  relationshipType?: string
  unitId?: string
}

type Submission = {
  email: string
  emailVerificationId: string
  firstName: string
  lastName: string
  phone: string | null
  relationshipType: string
  unitId: string
}

const normalizeEmail = (email: string) => email.trim().toLowerCase()

// undefined: el body no es JSON válido
async function readBody(request: Request) {
  try {
    return (await request.json()) as SubmitBody
  } catch {
    return undefined
  }
}

const normalizeFields = (body: SubmitBody) => ({
  email: normalizeEmail(body.email ?? ''),
  emailVerificationId: body.emailVerificationId,
  firstName: body.firstName?.trim(),
  lastName: body.lastName?.trim(),
  phone: body.phone?.trim() || null,
  relationshipType: body.relationshipType?.trim(),
  unitId: body.unitId,
})

function parseSubmission(body: SubmitBody) {
  const {
    email,
    emailVerificationId,
    firstName,
    lastName,
    phone,
    relationshipType,
    unitId,
  } = normalizeFields(body)

  // Sin el código verificado no hay solicitud: la base lo vuelve a chequear al insertar.
  if (
    !emailVerificationId ||
    !firstName ||
    !lastName ||
    !validEmail(email) ||
    (phone !== null && !validPhone(phone)) ||
    !unitId ||
    !relationshipType
  ) {
    return null
  }

  return {
    email,
    emailVerificationId,
    firstName,
    lastName,
    phone,
    relationshipType,
    unitId,
  }
}

// Solo se aceptan los tipos activos del catálogo, los mismos que ofrece el GET.
async function relationshipTypeNotFound(relationshipType: string) {
  const { data: type, error } = await supabaseAdmin
    .from('resident_relationship_types')
    .select('code')
    .eq('code', relationshipType)
    .eq('active', true)
    .maybeSingle()

  if (error) {
    return errorResponse('INTERNAL_ERROR', 500)
  }

  return type ? null : errorResponse('VALIDATION_ERROR', 400)
}

async function unitNotFound(joinLink: JoinLink, unitId: string) {
  const { data: unit, error } = await supabaseAdmin
    .from('unidades')
    .select('id')
    .eq('id', unitId)
    .eq('organization_id', joinLink.organization_id)
    .eq('edificio_id', joinLink.edificio_id)
    .maybeSingle()

  if (error) {
    return errorResponse('INTERNAL_ERROR', 500)
  }

  return unit ? null : errorResponse('UNIT_NOT_FOUND', 404)
}

async function unitAtCapacity(joinLink: JoinLink, unitId: string) {
  const { count: activeResidents, error } = await supabaseAdmin
    .from('resident_unit_links')
    .select('id', { count: 'exact', head: true })
    .eq('unidad_id', unitId)
    .eq('organization_id', joinLink.organization_id)
    .eq('active', true)

  if (error) {
    return errorResponse('INTERNAL_ERROR', 500)
  }

  return (activeResidents ?? 0) >= MAX_ACTIVE_RESIDENTS_PER_UNIT
    ? errorResponse('UNIT_LIMIT_REACHED', 409)
    : null
}

async function alreadyPending(joinLink: JoinLink, submission: Submission) {
  const { data: existingRequest, error } = await supabaseAdmin
    .from('resident_onboarding_requests')
    .select('id')
    .eq('organization_id', joinLink.organization_id)
    .eq('edificio_id', joinLink.edificio_id)
    .eq('unidad_id', submission.unitId)
    .eq('email', submission.email)
    .eq('status', 'PENDING_VERIFICATION')
    .maybeSingle()

  if (error) {
    return errorResponse('INTERNAL_ERROR', 500)
  }

  return existingRequest ? errorResponse('ALREADY_PENDING', 409) : null
}

// Corre los chequeos en orden y devuelve la primera respuesta de rechazo.
const findRejection = async (joinLink: JoinLink, submission: Submission) =>
  (await relationshipTypeNotFound(submission.relationshipType)) ??
  (await unitNotFound(joinLink, submission.unitId)) ??
  (await unitAtCapacity(joinLink, submission.unitId)) ??
  (await alreadyPending(joinLink, submission))

async function insertRequest(joinLink: JoinLink, submission: Submission) {
  const { error } = await supabaseAdmin
    .from('resident_onboarding_requests')
    .insert({
      edificio_id: joinLink.edificio_id,
      email: submission.email,
      email_verification_id: submission.emailVerificationId,
      first_name: submission.firstName,
      join_link_id: joinLink.id,
      last_name: submission.lastName,
      organization_id: joinLink.organization_id,
      phone: submission.phone,
      relationship_type_code: submission.relationshipType,
      status: 'PENDING_VERIFICATION',
      unidad_id: submission.unitId,
    })

  // The database rejects contacts on the organization's blacklist (eli-database-platform 20261006120000).
  if (error?.message === 'contact_blocked') {
    return errorResponse('CONTACT_BLOCKED', 403)
  }

  // Verificación vencida, ya usada o de otro email o link (eli-database-platform 20261010200000).
  if (error?.message === 'email_not_verified') {
    return errorResponse('EMAIL_NOT_VERIFIED', 403)
  }

  if (error) {
    return errorResponse('INTERNAL_ERROR', 500)
  }

  return NextResponse.json({ status: 'PENDING_VERIFICATION' }, { status: 201 })
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params

  if (!token) {
    return errorResponse('INVALID_TOKEN', 400)
  }

  const body = await readBody(request)
  const submission = body === undefined ? null : parseSubmission(body)

  if (!submission) {
    return errorResponse('VALIDATION_ERROR', 400)
  }

  const result = await findActiveJoinLink(token)

  if ('response' in result) {
    return result.response
  }

  const rejection = await findRejection(result.joinLink, submission)

  return rejection ?? insertRequest(result.joinLink, submission)
}
