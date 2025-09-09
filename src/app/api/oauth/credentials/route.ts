import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        googleClientId: true,
        googleClientSecret: true,
        oauthConfigured: true
      }
    })

    return NextResponse.json({
      clientId: user?.googleClientId || '',
      clientSecret: user?.googleClientSecret || '',
      configured: user?.oauthConfigured || false
    })
  } catch (error) {
    console.error('Failed to get OAuth credentials:', error)
    return NextResponse.json(
      { error: 'Failed to get OAuth credentials' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { clientId, clientSecret } = await request.json()

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Client ID and Client Secret are required' },
        { status: 400 }
      )
    }

    // Validate Client ID format
    if (!clientId.includes('.apps.googleusercontent.com')) {
      return NextResponse.json(
        { error: 'Invalid Client ID format. Should end with .apps.googleusercontent.com' },
        { status: 400 }
      )
    }

    // Validate Client Secret format
    if (!clientSecret.startsWith('GOCSPX-')) {
      return NextResponse.json(
        { error: 'Invalid Client Secret format. Should start with GOCSPX-' },
        { status: 400 }
      )
    }

    // Update user with OAuth credentials
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        googleClientId: clientId.trim(),
        googleClientSecret: clientSecret.trim(),
        oauthConfigured: true
      }
    })

    console.log(`✅ OAuth credentials configured for user: ${session.user.id}`)

    return NextResponse.json({
      success: true,
      message: 'OAuth credentials saved successfully'
    })
  } catch (error) {
    console.error('Failed to save OAuth credentials:', error)
    return NextResponse.json(
      { error: 'Failed to save OAuth credentials' },
      { status: 500 }
    )
  }
}