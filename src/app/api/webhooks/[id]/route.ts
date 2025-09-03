import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params

    const webhook = await prisma.webhook.findFirst({
      where: {
        id: resolvedParams.id,
        userId: session.user.id
      }
    })

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    // Calculate statistics
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

    return NextResponse.json({
      success: true,
      webhook: {
        ...webhook,
        totalCalls: callStats._count,
        successfulCalls,
        failedCalls,
        lastTriggered: lastCall?.createdAt?.toISOString()
      }
    })
  } catch (error) {
    console.error('Error fetching webhook:', error)
    return NextResponse.json(
      { error: 'Failed to fetch webhook' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const body = await request.json()
    const { name, description, url, events, status } = body

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

    const webhook = await prisma.webhook.findFirst({
      where: {
        id: resolvedParams.id,
        userId: session.user.id
      }
    })

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    const updatedWebhook = await prisma.webhook.update({
      where: {
        id: resolvedParams.id
      },
      data: {
        name,
        description,
        url,
        events,
        status
      }
    })

    // Calculate statistics
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

    return NextResponse.json({
      success: true,
      webhook: {
        ...updatedWebhook,
        totalCalls: callStats._count,
        successfulCalls,
        failedCalls
      }
    })
  } catch (error) {
    console.error('Error updating webhook:', error)
    return NextResponse.json(
      { error: 'Failed to update webhook' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params

    const webhook = await prisma.webhook.findFirst({
      where: {
        id: resolvedParams.id,
        userId: session.user.id
      }
    })

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    // Delete related webhook calls first
    await prisma.webhookCall.deleteMany({
      where: {
        webhookId: resolvedParams.id
      }
    })

    // Delete the webhook
    await prisma.webhook.delete({
      where: {
        id: resolvedParams.id
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Webhook deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting webhook:', error)
    return NextResponse.json(
      { error: 'Failed to delete webhook' },
      { status: 500 }
    )
  }
}