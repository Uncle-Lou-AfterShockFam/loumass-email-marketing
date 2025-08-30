import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GmailClient } from '@/lib/gmail-client'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const gmailClient = new GmailClient()
    const authUrl = gmailClient.getAuthUrl(session.user.id)

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Gmail connect error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Gmail connection' },
      { status: 500 }
    )
  }
}