import { NextResponse } from 'next/server'

import { validEmail } from '@/lib/email'
import { errorResponse, findActiveJoinLink } from '@/lib/joinLink'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Límites de la base (eli-database-platform 20261010200000): uno por minuto y cinco por hora.
const LIMIT_ERRORS: Record<string, string> = {
  code_recently_sent: 'CODE_RECENTLY_SENT',
  too_many_codes: 'TOO_MANY_CODES',
}

async function readEmail(request: Request) {
  try {
    const body = (await request.json()) as { email?: unknown }
    return typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  } catch {
    return ''
  }
}

// Manda un código de 6 dígitos al email; el código solo viaja en el mail.
export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params
  const email = await readEmail(request)

  if (!validEmail(email)) {
    return errorResponse('VALIDATION_ERROR', 400)
  }

  const result = await findActiveJoinLink(token)

  if ('response' in result) {
    return result.response
  }

  const { data, error } = await supabaseAdmin.rpc(
    'start_resident_email_verification',
    { p_email: email, p_join_link_id: result.joinLink.id },
  )

  if (error) {
    const limit = LIMIT_ERRORS[error.message]
    return limit
      ? errorResponse(limit, 429)
      : errorResponse('INTERNAL_ERROR', 500)
  }

  return NextResponse.json({ verificationId: data as string }, { status: 201 })
}
