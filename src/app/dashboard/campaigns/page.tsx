import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import CampaignsTable from '@/components/campaigns/CampaignsTable'
import CampaignStats from '@/components/campaigns/CampaignStats'

export default async function CampaignsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return null
  }

  // Get campaigns with metrics
  const campaigns = await prisma.campaign.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      recipients: {
        select: {
          status: true,
          openedAt: true,
          clickedAt: true,
          repliedAt: true
        }
      }
    }
  })

  // Calculate stats
  const stats = {
    total: campaigns.length,
    sent: campaigns.filter(c => c.status === 'SENT').length,
    draft: campaigns.filter(c => c.status === 'DRAFT').length,
    scheduled: campaigns.filter(c => c.status === 'SCHEDULED').length,
  }

  // Transform campaigns for table
  const campaignsWithMetrics = campaigns.map(campaign => ({
    id: campaign.id,
    name: campaign.name,
    subject: campaign.subject,
    status: campaign.status,
    sentAt: campaign.sentAt,
    scheduledFor: campaign.scheduledFor,
    recipients: campaign.recipients.length,
    opened: campaign.recipients.filter(r => r.openedAt).length,
    clicked: campaign.recipients.filter(r => r.clickedAt).length,
    replied: campaign.recipients.filter(r => r.repliedAt).length,
    openRate: campaign.recipients.length > 0 
      ? Math.round((campaign.recipients.filter(r => r.openedAt).length / campaign.recipients.length) * 100)
      : 0,
    clickRate: campaign.recipients.length > 0
      ? Math.round((campaign.recipients.filter(r => r.clickedAt).length / campaign.recipients.length) * 100)
      : 0,
    trackingEnabled: campaign.trackingEnabled,
    createdAt: campaign.createdAt
  }))

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600 mt-1">Create and manage your email campaigns</p>
        </div>
        <Link
          href="/dashboard/campaigns/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Campaign
          </span>
        </Link>
      </div>

      <CampaignStats stats={stats} />
      
      <div className="mt-8">
        <CampaignsTable campaigns={campaignsWithMetrics} />
      </div>
    </div>
  )
}