import { NextResponse } from 'next/server'

import { errorResponse, findActiveJoinLink } from '@/lib/joinLink'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type VerifyBody = { code?: unknown; verificationId?: unknown }

async function readBody(request: Request) {
  try {
    const body = (await request.json()) as VerifyBody
    return typeof body.code === 'string' &&
      typeof body.verificationId === 'string'
      ? { code: body.code, verificationId: body.verificationId }
      : null
  } catch {
    return null
  }
}

// Devuelve verified, invalid_code, expired, too_many_attempts o not_found.
export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params
  const body = await readBody(request)

  if (!body) {
    return errorResponse('VALIDATION_ERROR', 400)
  }

  const result = await findActiveJoinLink(token)

  if ('response' in result) {
    return result.response
  }

  const { data, error } = await supabaseAdmin.rpc(
    'verify_resident_email_code',
    { p_code: body.code, p_verification_id: body.verificationId },
  )

  // Un id que no es uuid falla en la base: para el vecino es un código que no existe.
  if (error?.code === '22P02') {
    return NextResponse.json({ status: 'not_found' })
  }

  if (error) {
    return errorResponse('INTERNAL_ERROR', 500)
  }

  return NextResponse.json({ status: data as string })
}
