'use client'

interface CampaignMetricsProps {
  metrics: {
    sent: number
    delivered: number
    opened: number
    clicked: number
    replied: number
    bounced: number
    failed: number
    openRate: number
    clickRate: number
    replyRate: number
    bounceRate: number
  }
  trackingEnabled: boolean
}

export default function CampaignMetrics({ metrics, trackingEnabled }: CampaignMetricsProps) {
  const metricCards = [
    {
      label: 'Sent',
      value: metrics.sent,
      color: 'blue',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      label: 'Delivered',
      value: metrics.delivered,
      percentage: metrics.sent > 0 ? Math.round((metrics.delivered / metrics.sent) * 100) : 0,
      color: 'green',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      label: 'Opens',
      value: metrics.opened,
      percentage: metrics.openRate,
      color: 'purple',
      disabled: !trackingEnabled,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )
    },
    {
      label: 'Clicks',
      value: metrics.clicked,
      percentage: metrics.clickRate,
      color: 'indigo',
      disabled: !trackingEnabled,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
      )
    },
    {
      label: 'Replies',
      value: metrics.replied,
      percentage: metrics.replyRate,
      color: 'teal',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      )
    },
    {
      label: 'Bounces',
      value: metrics.bounced,
      percentage: metrics.bounceRate,
      color: 'yellow',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      label: 'Failed',
      value: metrics.failed,
      percentage: metrics.sent > 0 ? Math.round((metrics.failed / metrics.sent) * 100) : 0,
      color: 'red',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ]

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
      green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
      indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
      teal: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200' },
      yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' },
      red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
      gray: { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-400', border: 'border-gray-200 dark:border-gray-700' }
    }
    return colors[color] || colors.gray
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metricCards.map((metric) => {
        const colors = getColorClasses(metric.disabled ? 'gray' : metric.color)
        
        return (
          <div
            key={metric.label}
            className={`${colors.bg} rounded-lg p-6 border ${colors.border} ${
              metric.disabled ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={colors.text}>{metric.icon}</div>
              {metric.percentage !== undefined && !metric.disabled && (
                <span className={`text-sm font-medium ${colors.text}`}>
                  {metric.percentage}%
                </span>
              )}
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {metric.disabled ? '-' : metric.value.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {metric.label}
                {metric.disabled && (
                  <span className="text-xs text-gray-600 dark:text-gray-400 block">
                    (Tracking disabled)
                  </span>
                )}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}