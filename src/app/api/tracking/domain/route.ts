import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { domain } = await request.json()

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      )
    }

    // Check if user already has a tracking domain
    const existingDomain = await prisma.trackingDomain.findFirst({
      where: { userId: session.user.id }
    })

    if (existingDomain) {
      return NextResponse.json(
        { error: 'You already have a tracking domain. Please remove it first.' },
        { status: 400 }
      )
    }

    // Create tracking domain
    const trackingDomain = await prisma.trackingDomain.create({
      data: {
        domain: domain.toLowerCase().trim(),
        userId: session.user.id,
        cnameTarget: process.env.TRACKING_CNAME_TARGET || 'tracking.loumass.com',
        verified: false
      }
    })

    return NextResponse.json(trackingDomain)
  } catch (error) {
    console.error('Create tracking domain error:', error)
    return NextResponse.json(
      { error: 'Failed to create tracking domain' },
      { status: 500 }
    )
  }
}