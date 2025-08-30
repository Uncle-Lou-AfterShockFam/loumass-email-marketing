'use client'

interface SequenceMetricsProps {
  metrics: {
    totalEnrollments: number
    activeEnrollments: number
    completedEnrollments: number
    pausedEnrollments: number
    completionRate: number
    averageTimeToComplete: string
    totalOpens: number
    totalClicks: number
    totalReplies: number
    overallEngagement: number
  }
  trackingEnabled: boolean
}

export default function SequenceMetrics({ metrics, trackingEnabled }: SequenceMetricsProps) {
  const metricCards = [
    {
      label: 'Total Enrollments',
      value: metrics.totalEnrollments,
      color: 'blue',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      label: 'Active',
      value: metrics.activeEnrollments,
      percentage: metrics.totalEnrollments > 0 ? 
        Math.round((metrics.activeEnrollments / metrics.totalEnrollments) * 100) : 0,
      color: 'green',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      label: 'Completed',
      value: metrics.completedEnrollments,
      percentage: metrics.completionRate,
      color: 'purple',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      label: 'Avg. Time to Complete',
      value: metrics.averageTimeToComplete,
      color: 'indigo',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      label: 'Total Opens',
      value: metrics.totalOpens,
      color: 'teal',
      disabled: !trackingEnabled,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )
    },
    {
      label: 'Total Clicks',
      value: metrics.totalClicks,
      color: 'yellow',
      disabled: !trackingEnabled,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
      )
    },
    {
      label: 'Total Replies',
      value: metrics.totalReplies,
      color: 'orange',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      )
    },
    {
      label: 'Overall Engagement',
      value: `${metrics.overallEngagement}%`,
      color: 'pink',
      disabled: !trackingEnabled,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
      orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
      pink: { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200' },
      gray: { bg: 'bg-gray-50', text: 'text-gray-400', border: 'border-gray-200' }
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
              <p className="text-2xl font-bold text-gray-900">
                {metric.disabled ? '-' : metric.value.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {metric.label}
                {metric.disabled && (
                  <span className="text-xs text-gray-500 block">
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