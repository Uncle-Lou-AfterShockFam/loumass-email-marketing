import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// Simple encryption for storing client secret
const ENCRYPTION_KEY = process.env.NEXTAUTH_SECRET || 'default-encryption-key'

function encrypt(text: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return encrypted
}

function decrypt(text: string): string {
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY)
  let decrypted = decipher.update(text, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        googleClientId: true,
        oauthConfigured: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      googleClientId: user.googleClientId || '',
      oauthConfigured: user.oauthConfigured
    })
  } catch (error) {
    console.error('Failed to fetch OAuth credentials:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { googleClientId, googleClientSecret } = await req.json()

    if (!googleClientId || !googleClientSecret) {
      return NextResponse.json({ 
        error: 'Both Client ID and Client Secret are required' 
      }, { status: 400 })
    }

    // Encrypt the client secret before storing
    const encryptedSecret = encrypt(googleClientSecret)

    // Update user's OAuth credentials
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        googleClientId,
        googleClientSecret: encryptedSecret,
        oauthConfigured: true
      }
    })

    return NextResponse.json({ 
      success: true,
      message: 'OAuth credentials saved successfully'
    })
  } catch (error) {
    console.error('Failed to save OAuth credentials:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Clear user's OAuth credentials
    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        googleClientId: null,
        googleClientSecret: null,
        oauthConfigured: false
      }
    })

    return NextResponse.json({ 
      success: true,
      message: 'OAuth credentials removed successfully'
    })
  } catch (error) {
    console.error('Failed to remove OAuth credentials:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}