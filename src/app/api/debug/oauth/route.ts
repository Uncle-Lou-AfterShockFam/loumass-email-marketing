import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Debug info (safe to expose in testing)
  const debugInfo = {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_URL_LENGTH: process.env.NEXTAUTH_URL?.length,
    GOOGLE_CLIENT_ID_EXISTS: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_ID_LENGTH: process.env.GOOGLE_CLIENT_ID?.length,
    REDIRECT_URI: `${process.env.NEXTAUTH_URL}/api/auth/gmail/callback`,
    REDIRECT_URI_LENGTH: `${process.env.NEXTAUTH_URL}/api/auth/gmail/callback`.length,
  }

  return NextResponse.json(debugInfo)
}