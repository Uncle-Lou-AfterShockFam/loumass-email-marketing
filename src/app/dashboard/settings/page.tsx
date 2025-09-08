import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AutomaticGmailConnection from '@/components/settings/AutomaticGmailConnection'
import TrackingDomain from '@/components/settings/TrackingDomain'
import AccountSettings from '@/components/settings/AccountSettings'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return null
  }

  const [user, trackingDomain] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        gmailToken: true // Include Gmail token data
      }
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
        {/* 🚀 NEW AUTOMATIC GMAIL CONNECTION - No manual OAuth setup needed! */}
        <AutomaticGmailConnection />

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