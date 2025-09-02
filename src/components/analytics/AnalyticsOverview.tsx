'use client'

interface AnalyticsOverviewProps {
  data: {
    totalEmails: number
    totalDelivered: number
    totalOpened: number
    totalClicked: number
    totalReplied: number
    totalBounced: number
    totalUnsubscribed: number
    deliveryRate: number
    openRate: number
    clickRate: number
    replyRate: number
    bounceRate: number
    unsubscribeRate: number
  }
}

export default function AnalyticsOverview({ data }: AnalyticsOverviewProps) {
  const metricCards = [
    {
      label: 'Total Emails',
      value: data.totalEmails,
      color: 'blue',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      label: 'Delivered',
      value: data.totalDelivered,
      percentage: data.deliveryRate,
      color: 'green',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      label: 'Opened',
      value: data.totalOpened,
      percentage: data.openRate,
      color: 'teal',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )
    },
    {
      label: 'Clicked',
      value: data.totalClicked,
      percentage: data.clickRate,
      color: 'purple',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      )
    },
    {
      label: 'Replied',
      value: data.totalReplied,
      percentage: data.replyRate,
      color: 'indigo',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      )
    },
    {
      label: 'Bounced',
      value: data.totalBounced,
      percentage: data.bounceRate,
      color: 'red',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      )
    },
    {
      label: 'Unsubscribed',
      value: data.totalUnsubscribed,
      percentage: data.unsubscribeRate,
      color: 'orange',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
        </svg>
      )
    }
  ]

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
      green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
      teal: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
      indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
      red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
      orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' }
    }
    return colors[color] || colors.blue
  }

  const getPercentageColor = (percentage: number, isNegative = false) => {
    if (isNegative) {
      return percentage < 5 ? 'text-green-600' : percentage < 10 ? 'text-yellow-600' : 'text-red-600'
    }
    return percentage > 40 ? 'text-green-600' : percentage > 20 ? 'text-yellow-600' : 'text-red-600'
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
      {metricCards.map((metric, index) => {
        const colors = getColorClasses(metric.color)
        const isNegativeMetric = metric.label === 'Bounced' || metric.label === 'Unsubscribed'
        
        return (
          <div
            key={metric.label}
            className={`${colors.bg} rounded-lg p-6 border ${colors.border}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={colors.text}>{metric.icon}</div>
              {metric.percentage !== undefined && (
                <span className={`text-sm font-medium ${getPercentageColor(metric.percentage, isNegativeMetric)}`}>
                  {metric.percentage.toFixed(1)}%
                </span>
              )}
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {metric.value.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {metric.label}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}