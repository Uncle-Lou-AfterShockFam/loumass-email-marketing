'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'

interface AnalyticsPageProps {
  params: {
    id: string
  }
}

interface CampaignAnalytics {
  campaign: {
    id: string
    name: string
    subject: string
    status: string
    sentAt: string | null
    trackingEnabled: boolean
  }
  metrics: {
    totalRecipients: number
    sentCount: number
    openedCount: number
    clickedCount: number
    repliedCount: number
    bouncedCount: number
    unsubscribedCount: number
    deliveredCount: number
    openRate: number
    clickRate: number
    replyRate: number
    bounceRate: number
    unsubscribeRate: number
    deliveryRate: number
  }
  timeAnalytics: Array<{
    hour: string
    opens: number
    clicks: number
  }>
  segmentAnalytics: {
    companies: Array<{
      company: string
      total: number
      opened: number
      clicked: number
      replied: number
      openRate: number
      clickRate: number
      replyRate: number
    }>
    tags: Array<{
      tag: string
      total: number
      opened: number
      clicked: number
      replied: number
      openRate: number
      clickRate: number
      replyRate: number
    }>
  }
  linkAnalytics: Array<{
    url: string
    clicks: number
    percentage: number
  }>
  recentActivity: Array<{
    id: string
    type: string
    timestamp: string
    contact: {
      email: string
      name: string
    } | null
    data: any
  }>
}

export default function CampaignAnalyticsPage({ params }: AnalyticsPageProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'engagement' | 'segments' | 'activity'>('overview')

  useEffect(() => {
    if (params.id) {
      loadAnalytics()
    }
  }, [params.id])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/campaigns/${params.id}/analytics`)
      
      if (!response.ok) {
        throw new Error('Failed to load analytics')
      }

      const data = await response.json()
      setAnalytics(data.analytics)
    } catch (error) {
      console.error('Error loading analytics:', error)
      toast.error('Failed to load campaign analytics')
      router.push('/dashboard/campaigns')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Analytics Not Available</h2>
        <Link 
          href="/dashboard/campaigns"
          className="text-blue-600 hover:text-blue-700"
        >
          Back to Campaigns
        </Link>
      </div>
    )
  }

  const { campaign, metrics, timeAnalytics, segmentAnalytics, linkAnalytics, recentActivity } = analytics

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <Link 
              href={`/dashboard/campaigns/${campaign.id}`}
              className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Campaign
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-1">{campaign.name}</p>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-gray-500">
              Subject: {campaign.subject}
            </p>
            {campaign.sentAt && (
              <p className="text-sm text-gray-500">
                Sent: {format(new Date(campaign.sentAt), 'MMM d, yyyy \'at\' h:mm a')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'engagement', label: 'Engagement Timeline' },
            { id: 'segments', label: 'Segments' },
            { id: 'activity', label: 'Recent Activity' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Delivered</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.deliveredCount.toLocaleString()}</p>
                  <p className="text-sm text-green-600">{metrics.deliveryRate}% delivery rate</p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Opened</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.openedCount.toLocaleString()}</p>
                  <p className="text-sm text-blue-600">{metrics.openRate}% open rate</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Clicked</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.clickedCount.toLocaleString()}</p>
                  <p className="text-sm text-purple-600">{metrics.clickRate}% click rate</p>
                </div>
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Replied</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.repliedCount.toLocaleString()}</p>
                  <p className="text-sm text-orange-600">{metrics.replyRate}% reply rate</p>
                </div>
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Issues</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Bounced</span>
                  <span className="font-medium text-red-600">{metrics.bouncedCount} ({metrics.bounceRate}%)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Unsubscribed</span>
                  <span className="font-medium text-orange-600">{metrics.unsubscribedCount} ({metrics.unsubscribeRate}%)</span>
                </div>
              </div>
            </div>

            {linkAnalytics.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Links</h3>
                <div className="space-y-3">
                  {linkAnalytics.slice(0, 3).map((link, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-gray-600 truncate max-w-[200px]" title={link.url}>
                        {new URL(link.url).hostname}
                      </span>
                      <span className="font-medium text-blue-600">{link.clicks} clicks</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Status</span>
                  <span className={`font-medium px-2 py-1 rounded-full text-xs ${
                    campaign.status === 'SENT' ? 'bg-green-100 text-green-800' :
                    campaign.status === 'SENDING' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {campaign.status}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Tracking</span>
                  <span className={`font-medium ${campaign.trackingEnabled ? 'text-green-600' : 'text-gray-600'}`}>
                    {campaign.trackingEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Engagement Timeline Tab */}
      {activeTab === 'engagement' && (
        <div className="space-y-8">
          {campaign.trackingEnabled && timeAnalytics.length > 0 ? (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Hourly Engagement (First 48 Hours)</h3>
              <div className="space-y-4">
                {timeAnalytics.map((data, index) => (
                  <div key={index} className="flex items-center justify-between border-b pb-3">
                    <div className="text-sm text-gray-600 w-32">
                      {format(new Date(data.hour), 'MMM d, h:mm a')}
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="flex gap-4 text-sm">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                          <span>{data.opens} opens</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                          <span>{data.clicks} clicks</span>
                        </div>
                      </div>
                      <div className="flex mt-2 h-2 bg-gray-200 rounded">
                        <div 
                          className="bg-blue-500 rounded-l"
                          style={{ width: `${Math.max(5, (data.opens / Math.max(...timeAnalytics.map(t => t.opens))) * 60)}px` }}
                        ></div>
                        <div 
                          className="bg-purple-500 rounded-r"
                          style={{ width: `${Math.max(5, (data.clicks / Math.max(...timeAnalytics.map(t => t.clicks))) * 30)}px` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500">
                {!campaign.trackingEnabled 
                  ? 'Tracking is disabled for this campaign'
                  : 'No engagement data available yet'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Segments Tab */}
      {activeTab === 'segments' && (
        <div className="space-y-8">
          {/* Company Performance */}
          {segmentAnalytics.companies.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Performance by Company</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Company</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Recipients</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Open Rate</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Click Rate</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Reply Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {segmentAnalytics.companies.map((company, index) => (
                      <tr key={index} className="border-t">
                        <td className="py-3 px-4 font-medium">{company.company}</td>
                        <td className="text-center py-3 px-4">{company.total}</td>
                        <td className="text-center py-3 px-4">{company.openRate}%</td>
                        <td className="text-center py-3 px-4">{company.clickRate}%</td>
                        <td className="text-center py-3 px-4">{company.replyRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tag Performance */}
          {segmentAnalytics.tags.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Performance by Tag</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Tag</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Recipients</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Open Rate</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Click Rate</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Reply Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {segmentAnalytics.tags.map((tag, index) => (
                      <tr key={index} className="border-t">
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {tag.tag}
                          </span>
                        </td>
                        <td className="text-center py-3 px-4">{tag.total}</td>
                        <td className="text-center py-3 px-4">{tag.openRate}%</td>
                        <td className="text-center py-3 px-4">{tag.clickRate}%</td>
                        <td className="text-center py-3 px-4">{tag.replyRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {segmentAnalytics.companies.length === 0 && segmentAnalytics.tags.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500">No segmentation data available</p>
            </div>
          )}
        </div>
      )}

      {/* Recent Activity Tab */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <p className="text-sm text-gray-600 mt-1">Latest opens, clicks, and replies</p>
          </div>
          
          {recentActivity.length > 0 ? (
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.type === 'OPENED' ? 'bg-blue-500' :
                        activity.type === 'CLICKED' ? 'bg-purple-500' :
                        activity.type === 'REPLIED' ? 'bg-orange-500' :
                        activity.type === 'BOUNCED' ? 'bg-red-500' :
                        'bg-gray-500'
                      }`}></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {activity.contact?.name || activity.contact?.email || 'Unknown contact'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {activity.type.toLowerCase()} the email
                          {activity.type === 'CLICKED' && activity.data?.url && (
                            <span> - <a href={activity.data.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {new URL(activity.data.url).hostname}
                            </a></span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <p className="text-gray-500">No recent activity</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}