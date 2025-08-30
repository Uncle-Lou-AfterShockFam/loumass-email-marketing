import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import DashboardStats from '@/components/dashboard/DashboardStats'
import RecentCampaigns from '@/components/dashboard/RecentCampaigns'
import QuickActions from '@/components/dashboard/QuickActions'

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  let session;
  
  try {
    session = await getServerSession(authOptions)
  } catch (error) {
    console.error('Auth session error:', error)
    // Redirect to sign-in if auth fails
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Error</h1>
          <p className="text-gray-600 mb-4">Unable to verify your session.</p>
          <a href="/auth/signin" className="text-blue-600 hover:text-blue-500 underline">
            Sign In
          </a>
        </div>
      </div>
    )
  }
  
  if (!session?.user?.id) {
    return null
  }

  // Initialize with defaults
  let gmailToken = null
  let stats = {
    campaigns: 0,
    contacts: 0,
    emailsSent: 0,
    openRate: 0,
  }
  let recentCampaigns: any[] = []

  try {
    // Check if Gmail is connected
    gmailToken = await prisma.gmailToken.findUnique({
      where: { userId: session.user.id }
    })

    // Get statistics
    const [campaignCount, contactCount, emailCount] = await Promise.all([
      prisma.campaign.count({ where: { userId: session.user.id } }),
      prisma.contact.count({ where: { userId: session.user.id } }),
      prisma.recipient.count({ 
        where: { 
          campaign: { userId: session.user.id },
          status: 'SENT'
        } 
      })
    ])

    stats = {
      campaigns: campaignCount,
      contacts: contactCount,
      emailsSent: emailCount,
      openRate: 0, // Will calculate from tracking events
    }

    // Get recent campaigns
    recentCampaigns = await prisma.campaign.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        recipients: {
          select: {
            id: true,
            status: true,
            openedAt: true,
            clickedAt: true
          }
        }
      }
    })
  } catch (error) {
    console.error('Dashboard data loading error:', error)
    // Continue with default values - don't crash the page
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back, {session.user.email}</p>
      </div>

      {!gmailToken && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Gmail not connected</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Connect your Gmail account to start sending campaigns.</p>
                <Link href="/dashboard/settings" className="font-medium underline hover:text-yellow-600">
                  Connect Gmail →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <DashboardStats stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <RecentCampaigns campaigns={recentCampaigns} />
        <QuickActions gmailConnected={!!gmailToken} />
      </div>
    </div>
  )
}