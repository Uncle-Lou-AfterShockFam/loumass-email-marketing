import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import GmailConnection from '@/components/settings/GmailConnection'
import TrackingDomain from '@/components/settings/TrackingDomain'
import AccountSettings from '@/components/settings/AccountSettings'
import OAuthCredentials from '@/components/settings/OAuthCredentials'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return null
  }

  const [gmailToken, user, trackingDomain] = await Promise.all([
    prisma.gmailToken.findUnique({
      where: { userId: session.user.id }
    }),
    prisma.user.findUnique({
      where: { id: session.user.id }
    }),
    prisma.trackingDomain.findFirst({
      where: { userId: session.user.id }
    })
  ])

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and email configuration</p>
      </div>

      <div className="space-y-6">
        <OAuthCredentials />
        
        <GmailConnection 
          isConnected={!!gmailToken}
          email={gmailToken?.email}
        />

        <TrackingDomain 
          domain={trackingDomain}
          userId={session.user.id}
        />

        <AccountSettings 
          user={user}
        />
      </div>
    </div>
  )
}