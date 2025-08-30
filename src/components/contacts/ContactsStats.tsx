'use client'

interface ContactsStatsProps {
  stats: {
    totalContacts: number
    subscribedContacts: number
    unsubscribedContacts: number
    subscribedRate: number
    recentlyAdded: number
    engagedContacts: number
    engagementRate: number
  }
}

export default function ContactsStats({ stats }: ContactsStatsProps) {
  const statCards = [
    {
      label: 'Total Contacts',
      value: stats.totalContacts,
      color: 'blue',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      label: 'Subscribed',
      value: stats.subscribedContacts,
      percentage: stats.subscribedRate,
      color: 'green',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      label: 'Unsubscribed',
      value: stats.unsubscribedContacts,
      percentage: 100 - stats.subscribedRate,
      color: 'red',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      label: 'Recent Adds',
      value: stats.recentlyAdded,
      subtitle: 'Last 30 days',
      color: 'purple',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      )
    },
    {
      label: 'Engaged',
      value: stats.engagedContacts,
      percentage: stats.engagementRate,
      subtitle: 'Last 90 days',
      color: 'teal',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    }
  ]

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
      green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
      red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
      teal: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200' }
    }
    return colors[color] || colors.blue
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {statCards.map((stat) => {
        const colors = getColorClasses(stat.color)
        
        return (
          <div
            key={stat.label}
            className={`${colors.bg} rounded-lg p-6 border ${colors.border}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={colors.text}>{stat.icon}</div>
              {stat.percentage !== undefined && (
                <span className={`text-sm font-medium ${colors.text}`}>
                  {Math.round(stat.percentage)}%
                </span>
              )}
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {stat.value.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {stat.label}
              </p>
              {stat.subtitle && (
                <p className="text-xs text-gray-500 mt-1">
                  {stat.subtitle}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}