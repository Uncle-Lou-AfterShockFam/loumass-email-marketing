import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateSecureToken } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const webhooks = await prisma.webhook.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculate statistics for each webhook
    const webhooksWithStats = await Promise.all(webhooks.map(async (webhook) => {
      const callStats = await prisma.webhookCall.aggregate({
        where: {
          webhookId: webhook.id
        },
        _count: true
      })

      const successfulCalls = await prisma.webhookCall.count({
        where: {
          webhookId: webhook.id,
          status: 'SUCCESS'
        }
      })

      const failedCalls = await prisma.webhookCall.count({
        where: {
          webhookId: webhook.id,
          status: 'FAILED'
        }
      })

      const lastCall = await prisma.webhookCall.findFirst({
        where: {
          webhookId: webhook.id
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      return {
        ...webhook,
        totalCalls: callStats._count,
        successfulCalls,
        failedCalls,
        lastTriggered: lastCall?.createdAt?.toISOString()
      }
    }))

    return NextResponse.json({
      success: true,
      webhooks: webhooksWithStats
    })
  } catch (error) {
    console.error('Error fetching webhooks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch webhooks' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, url, events, status = 'ACTIVE' } = body

    // Validation
    if (!name || !url || !events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'Name, URL, and events are required' },
        { status: 400 }
      )
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Generate secret key
    const secretKey = generateSecureToken(32)

    const webhook = await prisma.webhook.create({
      data: {
        name,
        description,
        url,
        events,
        status,
        secretKey,
        userId: session.user.id
      }
    })

    return NextResponse.json({
      success: true,
      webhook: {
        ...webhook,
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0
      }
    })
  } catch (error) {
    console.error('Error creating webhook:', error)
    return NextResponse.json(
      { error: 'Failed to create webhook' },
      { status: 500 }
    )
  }
}