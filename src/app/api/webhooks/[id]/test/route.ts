import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params

    // Verify webhook ownership
    const webhook = await prisma.webhook.findFirst({
      where: {
        id: resolvedParams.id,
        userId: session.user.id
      }
    })

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    if (webhook.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Webhook is not active' }, { status: 400 })
    }

    // Create test payload
    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook call from LOUMASS',
        webhook: {
          id: resolvedParams.id,
          name: webhook.name
        }
      }
    }

    // Generate signature
    const signature = crypto
      .createHmac('sha256', webhook.secretKey)
      .update(JSON.stringify(testPayload))
      .digest('hex')

    const startTime = Date.now()
    let webhookCall: any = null

    try {
      // Make the webhook call
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-LOUMASS-Signature': `sha256=${signature}`,
          'User-Agent': 'LOUMASS-Webhook/1.0'
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      const responseTime = Date.now() - startTime
      const responseText = await response.text()

      // Log the webhook call
      webhookCall = await prisma.webhookCall.create({
        data: {
          webhookId: webhook.id,
          event: 'webhook.test',
          status: response.ok ? 'SUCCESS' : 'FAILED',
          responseCode: response.status,
          responseTime,
          payload: testPayload,
          response: responseText,
          error: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Test webhook sent successfully',
        result: {
          status: response.ok ? 'SUCCESS' : 'FAILED',
          responseCode: response.status,
          responseTime,
          call: webhookCall
        }
      })

    } catch (error: any) {
      const responseTime = Date.now() - startTime
      
      // Log the failed webhook call
      webhookCall = await prisma.webhookCall.create({
        data: {
          webhookId: webhook.id,
          event: 'webhook.test',
          status: 'FAILED',
          responseTime,
          payload: testPayload,
          error: error.message || 'Unknown error'
        }
      })

      return NextResponse.json({
        success: false,
        message: 'Test webhook failed',
        result: {
          status: 'FAILED',
          responseTime,
          error: error.message,
          call: webhookCall
        }
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Error testing webhook:', error)
    return NextResponse.json(
      { error: 'Failed to test webhook' },
      { status: 500 }
    )
  }
}