'use client'

import { useState } from 'react'

interface TimeSeriesData {
  date: string
  sent: number
  delivered: number
  opened: number
  clicked: number
  replied: number
}

interface EngagementData {
  date: string
  openRate: number
  clickRate: number
  replyRate: number
}

interface Campaign {
  id: string
  name: string
  subject: string
  sent: number
  delivered: number
  opened: number
  clicked: number
  replied: number
  deliveryRate: number
  openRate: number
  clickRate: number
  replyRate: number
  sentAt: Date
}

interface AnalyticsChartsProps {
  timeSeriesData: {
    emails: TimeSeriesData[]
    engagement: EngagementData[]
  }
  topCampaigns: Campaign[]
}

export default function AnalyticsCharts({ timeSeriesData, topCampaigns }: AnalyticsChartsProps) {
  const [activeChart, setActiveChart] = useState<'volume' | 'engagement'>('volume')
  const [volumeMetric, setVolumeMetric] = useState<'sent' | 'delivered' | 'opened' | 'clicked' | 'replied'>('sent')
  const [engagementMetric, setEngagementMetric] = useState<'openRate' | 'clickRate' | 'replyRate'>('openRate')

  const chartTabs = [
    { id: 'volume', label: 'Email Volume', icon: '📊' },
    { id: 'engagement', label: 'Engagement Rates', icon: '📈' }
  ]

  const volumeOptions = [
    { value: 'sent', label: 'Sent', color: 'text-blue-600' },
    { value: 'delivered', label: 'Delivered', color: 'text-green-600' },
    { value: 'opened', label: 'Opened', color: 'text-teal-600' },
    { value: 'clicked', label: 'Clicked', color: 'text-purple-600' },
    { value: 'replied', label: 'Replied', color: 'text-indigo-600' }
  ]

  const engagementOptions = [
    { value: 'openRate', label: 'Open Rate', color: 'text-teal-600' },
    { value: 'clickRate', label: 'Click Rate', color: 'text-purple-600' },
    { value: 'replyRate', label: 'Reply Rate', color: 'text-indigo-600' }
  ]

  // Calculate max values for chart scaling
  const maxVolumeValue = Math.max(...timeSeriesData.emails.map(d => Math.max(d.sent, d.delivered, d.opened, d.clicked, d.replied)))
  const maxEngagementValue = Math.max(...timeSeriesData.engagement.map(d => Math.max(d.openRate, d.clickRate, d.replyRate)))

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getBarHeight = (value: number, maxValue: number) => {
    return (value / maxValue) * 200 // 200px max height
  }

  return (
    <div className="space-y-6">
      {/* Charts Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Performance Analytics</h3>
              <p className="text-sm text-gray-600">Email performance over time</p>
            </div>
            
            {/* Chart Type Tabs */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {chartTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveChart(tab.id as 'volume' | 'engagement')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeChart === tab.id
                      ? 'bg-white text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-100'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Chart Controls */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {activeChart === 'volume' ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Showing:</span>
                  <select
                    value={volumeMetric}
                    onChange={(e) => setVolumeMetric(e.target.value as any)}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {volumeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Showing:</span>
                  <select
                    value={engagementMetric}
                    onChange={(e) => setEngagementMetric(e.target.value as any)}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {engagementOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {activeChart === 'volume' ? 'Total emails' : 'Percentage rates'}
            </div>
          </div>

          {/* Chart Area */}
          <div className="relative">
            {activeChart === 'volume' ? (
              <div className="flex items-end justify-between gap-2 h-64 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                {timeSeriesData.emails.map((data, index) => {
                  const value = data[volumeMetric]
                  const height = getBarHeight(value, maxVolumeValue)
                  const selectedOption = volumeOptions.find(opt => opt.value === volumeMetric)
                  
                  return (
                    <div key={index} className="flex flex-col items-center group">
                      <div className="relative mb-2">
                        <div
                          className="w-8 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-sm transition-all hover:opacity-80"
                          style={{ height: `${height}px` }}
                        />
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {value.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 transform -rotate-45 origin-top-left">
                        {formatDate(data.date)}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex items-end justify-between gap-2 h-64 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                {timeSeriesData.engagement.map((data, index) => {
                  const value = data[engagementMetric]
                  const height = getBarHeight(value, maxEngagementValue)
                  
                  return (
                    <div key={index} className="flex flex-col items-center group">
                      <div className="relative mb-2">
                        <div
                          className="w-8 bg-gradient-to-t from-purple-500 to-purple-400 rounded-t-sm transition-all hover:opacity-80"
                          style={{ height: `${height}px` }}
                        />
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {value.toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 transform -rotate-45 origin-top-left">
                        {formatDate(data.date)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Performing Campaigns */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Top Performing Campaigns</h3>
              <p className="text-sm text-gray-600">Your best campaigns from the selected period</p>
            </div>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View all campaigns →
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  <th className="pb-4">Campaign</th>
                  <th className="pb-4">Sent</th>
                  <th className="pb-4">Delivered</th>
                  <th className="pb-4">Opens</th>
                  <th className="pb-4">Clicks</th>
                  <th className="pb-4">Replies</th>
                  <th className="pb-4">Sent Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {topCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700">
                    <td className="py-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{campaign.name}</div>
                        <div className="text-sm text-gray-600 truncate max-w-xs">{campaign.subject}</div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{campaign.sent.toLocaleString()}</div>
                    </td>
                    <td className="py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{campaign.delivered.toLocaleString()}</div>
                        <div className="text-xs text-green-600">{campaign.deliveryRate.toFixed(1)}%</div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{campaign.opened.toLocaleString()}</div>
                        <div className="text-xs text-teal-600">{campaign.openRate.toFixed(1)}%</div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{campaign.clicked.toLocaleString()}</div>
                        <div className="text-xs text-purple-600">{campaign.clickRate.toFixed(1)}%</div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{campaign.replied.toLocaleString()}</div>
                        <div className="text-xs text-indigo-600">{campaign.replyRate.toFixed(1)}%</div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="text-sm text-gray-600">
                        {campaign.sentAt.toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}