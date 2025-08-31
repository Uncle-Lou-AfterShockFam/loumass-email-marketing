import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import CampaignMetrics from '@/components/campaigns/CampaignMetrics'
import RecipientsList from '@/components/campaigns/RecipientsList'
import EmailPreview from '@/components/campaigns/EmailPreview'
import SendCampaignButton from '@/components/campaigns/SendCampaignButton'
import EventsTab from '@/components/campaigns/EventsTab'
import ReplyTrackingCard from '@/components/campaigns/ReplyTrackingCard'

interface CampaignPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function CampaignPage({ params }: CampaignPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const { id } = await params

  const campaign = await prisma.campaign.findUnique({
    where: {
      id: id,
      userId: session.user.id
    },
    include: {
      recipients: {
        include: {
          contact: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
              company: true
            }
          }
        }
      },
      emailEvents: {
        orderBy: {
          createdAt: 'desc'
        }
      }
    }
  })

  if (!campaign) {
    notFound()
  }

  // Calculate detailed metrics
  const metrics = {
    sent: campaign.sentCount,
    // Delivered includes all successfully sent emails (SENT, OPENED, CLICKED, REPLIED)
    delivered: campaign.recipients.filter(r => 
      r.status === 'SENT' || 
      r.status === 'OPENED' || 
      r.status === 'CLICKED' || 
      r.status === 'REPLIED'
    ).length,
    opened: campaign.openCount,
    clicked: campaign.clickCount,
    replied: campaign.replyCount,
    bounced: campaign.bounceCount,
    failed: campaign.failedCount,
    openRate: campaign.sentCount > 0 ? Math.round((campaign.openCount / campaign.sentCount) * 100) : 0,
    clickRate: campaign.sentCount > 0 ? Math.round((campaign.clickCount / campaign.sentCount) * 100) : 0,
    replyRate: campaign.sentCount > 0 ? Math.round((campaign.replyCount / campaign.sentCount) * 100) : 0,
    bounceRate: campaign.sentCount > 0 ? Math.round((campaign.bounceCount / campaign.sentCount) * 100) : 0
  }

  // Get engagement timeline data
  const engagementTimeline = campaign.emailEvents.reduce((acc, event) => {
    const date = new Date(event.createdAt).toLocaleDateString()
    if (!acc[date]) {
      acc[date] = { opens: 0, clicks: 0, replies: 0 }
    }
    if (event.eventType === 'OPENED') acc[date].opens++
    if (event.eventType === 'CLICKED') acc[date].clicks++
    if (event.eventType === 'REPLIED') acc[date].replies++
    return acc
  }, {} as Record<string, { opens: number; clicks: number; replies: number }>)

  // Get top performing links (if click tracking is enabled)
  const clickEvents = campaign.emailEvents.filter(e => e.eventType === 'CLICKED')
  const topLinks = clickEvents.reduce((acc, event) => {
    const url = event.eventData as { url?: string }
    if (url?.url) {
      acc[url.url] = (acc[url.url] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  const sortedTopLinks = Object.entries(topLinks)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([url, clicks]) => ({ url, clicks }))

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <Link 
              href="/dashboard/campaigns"
              className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Campaigns
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
            <div className="flex items-center gap-4 mt-2">
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                campaign.status === 'SENT' ? 'bg-green-100 text-green-800' :
                campaign.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                campaign.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                campaign.status === 'SENDING' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {campaign.status}
              </span>
              <span className="text-sm text-gray-500">
                Subject: {campaign.subject}
              </span>
              {campaign.trackingEnabled && (
                <span className="text-sm text-green-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Tracking Enabled
                </span>
              )}
            </div>
          </div>
          
          <div className="flex gap-3">
            {campaign.status === 'DRAFT' && (
              <>
                <Link
                  href={`/dashboard/campaigns/${campaign.id}/edit`}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                >
                  Edit Campaign
                </Link>
                <SendCampaignButton 
                  campaignId={campaign.id}
                  status={campaign.status}
                  recipientCount={campaign.recipients.length}
                />
              </>
            )}
            {campaign.trackingEnabled && (
              <Link
                href={`/dashboard/campaigns/${campaign.id}/analytics`}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                View Analytics
              </Link>
            )}
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Overview */}
      <CampaignMetrics 
        metrics={metrics}
        trackingEnabled={campaign.trackingEnabled}
      />

      {/* Engagement Timeline (only if tracking is enabled) */}
      {campaign.trackingEnabled && Object.keys(engagementTimeline).length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Engagement Timeline</h2>
          <div className="space-y-4">
            {Object.entries(engagementTimeline)
              .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
              .map(([date, data]) => (
                <div key={date} className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm text-gray-600">{date}</span>
                  <div className="flex gap-6">
                    <span className="text-sm">
                      <span className="font-medium">{data.opens}</span> opens
                    </span>
                    <span className="text-sm">
                      <span className="font-medium">{data.clicks}</span> clicks
                    </span>
                    <span className="text-sm">
                      <span className="font-medium">{data.replies}</span> replies
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Top Performing Links (only if click tracking is enabled) */}
      {campaign.trackingEnabled && sortedTopLinks.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Clicked Links</h2>
          <div className="space-y-3">
            {sortedTopLinks.map(({ url, clicks }) => (
              <div key={url} className="flex items-center justify-between">
                <a 
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 text-sm truncate max-w-md"
                >
                  {url}
                </a>
                <span className="text-sm font-medium">{clicks} clicks</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Email Preview */}
      <EmailPreview 
        subject={campaign.subject}
        content={campaign.content}
      />

      {/* Reply Tracking Card - Show reply tracking setup */}
      {campaign.status === 'SENT' && (
        <div className="mt-8">
          <ReplyTrackingCard />
        </div>
      )}

      {/* Events Tab - Show all tracking events with IP/Location */}
      {campaign.trackingEnabled && campaign.status === 'SENT' && (
        <div className="mt-8">
          <EventsTab campaignId={campaign.id} />
        </div>
      )}

      {/* Recipients List */}
      <RecipientsList 
        recipients={campaign.recipients}
        trackingEnabled={campaign.trackingEnabled}
      />
    </div>
  )
}