import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify webhook ownership
    const webhook = await prisma.webhook.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    // Get URL search params for pagination
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const offset = (page - 1) * limit

    // Get webhook calls
    const calls = await prisma.webhookCall.findMany({
      where: {
        webhookId: params.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    })

    // Get total count for pagination
    const totalCount = await prisma.webhookCall.count({
      where: {
        webhookId: params.id
      }
    })

    return NextResponse.json({
      success: true,
      calls,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching webhook calls:', error)
    return NextResponse.json(
      { error: 'Failed to fetch webhook calls' },
      { status: 500 }
    )
  }
}