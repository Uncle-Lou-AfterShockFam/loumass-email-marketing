import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { automationTrigger } from '@/services/automationTrigger'
import { z } from 'zod'

const webhookPayloadSchema = z.object({
  contactId: z.string().optional(),
  contact_id: z.string().optional(),
  email: z.string().email().optional(),
  data: z.record(z.string(), z.any()).optional()
})

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ webhookId: string }> }
) {
  const params = await context.params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const webhookId = params.webhookId
    const payload = await request.json()

    // Validate payload
    const validatedPayload = webhookPayloadSchema.parse(payload)

    // Trigger webhook automations
    await automationTrigger.triggerWebhook(
      session.user.id,
      webhookId,
      validatedPayload
    )

    return NextResponse.json({ 
      success: true,
      message: 'Webhook processed successfully'
    })

  } catch (error) {
    console.error('Webhook trigger error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid payload format', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Allow webhook calls without authentication for external services
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}