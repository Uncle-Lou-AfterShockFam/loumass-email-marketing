import Link from 'next/link'

interface Campaign {
  id: string
  name: string
  subject: string
  status: string
  createdAt: Date
  recipients: {
    id: string
    status: string
    openedAt: Date | null
    clickedAt: Date | null
  }[]
}

interface RecentCampaignsProps {
  campaigns: Campaign[]
}

export default function RecentCampaigns({ campaigns }: RecentCampaignsProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800'
      case 'sending':
        return 'bg-blue-100 text-blue-800'
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const calculateStats = (campaign: Campaign) => {
    const sent = campaign.recipients.length
    const opened = campaign.recipients.filter(r => r.openedAt).length
    const clicked = campaign.recipients.filter(r => r.clickedAt).length
    
    return {
      sent,
      openRate: sent > 0 ? ((opened / sent) * 100).toFixed(1) : '0',
      clickRate: sent > 0 ? ((clicked / sent) * 100).toFixed(1) : '0'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Campaigns</h2>
          <Link href="/dashboard/campaigns" className="text-sm text-blue-600 hover:text-blue-500">
            View all →
          </Link>
        </div>
      </div>
      
      <div className="divide-y divide-gray-200">
        {campaigns.length > 0 ? (
          campaigns.map((campaign) => {
            const stats = calculateStats(campaign)
            return (
              <div key={campaign.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Link href={`/dashboard/campaigns/${campaign.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">
                      {campaign.name}
                    </Link>
                    <p className="text-sm text-gray-500 mt-1">{campaign.subject}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-gray-500">
                        {stats.sent} sent
                      </span>
                      <span className="text-xs text-gray-500">
                        {stats.openRate}% opened
                      </span>
                      <span className="text-xs text-gray-500">
                        {stats.clickRate}% clicked
                      </span>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(campaign.status)}`}>
                    {campaign.status}
                  </span>
                </div>
              </div>
            )
          })
        ) : (
          <div className="px-6 py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No campaigns yet</p>
            <Link href="/dashboard/campaigns/new" className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-500">
              Create your first campaign →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}