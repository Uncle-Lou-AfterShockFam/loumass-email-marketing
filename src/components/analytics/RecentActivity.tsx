'use client'

interface Activity {
  id: string
  type: 'campaign_sent' | 'high_engagement' | 'sequence_completed' | 'bounce_alert' | 'reply_received' | 'contact_imported'
  title: string
  description: string
  timestamp: Date
  metadata: Record<string, any>
}

interface RecentActivityProps {
  activities: Activity[]
}

export default function RecentActivity({ activities }: RecentActivityProps) {
  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'campaign_sent':
        return (
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
        )
      case 'high_engagement':
        return (
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        )
      case 'sequence_completed':
        return (
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
      case 'bounce_alert':
        return (
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        )
      case 'reply_received':
        return (
          <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </div>
        )
      case 'contact_imported':
        return (
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
        )
      default:
        return (
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
    }
  }

  const getActivityBadge = (type: Activity['type']) => {
    switch (type) {
      case 'campaign_sent':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Campaign</span>
      case 'high_engagement':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Success</span>
      case 'sequence_completed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Sequence</span>
      case 'bounce_alert':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Alert</span>
      case 'reply_received':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">Reply</span>
      case 'contact_imported':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">Import</span>
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Activity</span>
    }
  }

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - timestamp.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60))
      return diffMins < 1 ? 'Just now' : `${diffMins}m ago`
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else if (diffDays < 7) {
      return `${diffDays}d ago`
    } else {
      return timestamp.toLocaleDateString()
    }
  }

  const getActionButton = (activity: Activity) => {
    switch (activity.type) {
      case 'campaign_sent':
        return (
          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            View Campaign
          </button>
        )
      case 'high_engagement':
        return (
          <button className="text-green-600 hover:text-green-800 text-sm font-medium">
            View Details
          </button>
        )
      case 'sequence_completed':
        return (
          <button className="text-purple-600 hover:text-purple-800 text-sm font-medium">
            View Sequence
          </button>
        )
      case 'bounce_alert':
        return (
          <button className="text-red-600 hover:text-red-800 text-sm font-medium">
            Review Issues
          </button>
        )
      case 'reply_received':
        return (
          <button className="text-teal-600 hover:text-teal-800 text-sm font-medium">
            View Replies
          </button>
        )
      case 'contact_imported':
        return (
          <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
            View Contacts
          </button>
        )
      default:
        return null
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h3>
            <p className="text-sm text-gray-600">Latest updates and notifications</p>
          </div>
          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            View all activity →
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {activities.length === 0 ? (
          <div className="p-6 text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">No recent activity</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Your recent activity will appear here</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="p-6 hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-start gap-4">
                {getActivityIcon(activity.type)}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    {getActivityBadge(activity.type)}
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </div>
                  
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                    {activity.title}
                  </h4>
                  
                  <p className="text-sm text-gray-600 mb-3">
                    {activity.description}
                  </p>

                  {/* Metadata Display */}
                  {Object.keys(activity.metadata).length > 0 && (
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 dark:text-gray-400 mb-3">
                      {activity.metadata.recipientCount && (
                        <span>Recipients: {activity.metadata.recipientCount.toLocaleString()}</span>
                      )}
                      {activity.metadata.deliveryRate && (
                        <span>Delivery: {activity.metadata.deliveryRate}%</span>
                      )}
                      {activity.metadata.openRate && (
                        <span>Open Rate: {activity.metadata.openRate}%</span>
                      )}
                      {activity.metadata.bounceRate && (
                        <span>Bounce Rate: {activity.metadata.bounceRate}%</span>
                      )}
                      {activity.metadata.replyCount && (
                        <span>Replies: {activity.metadata.replyCount}</span>
                      )}
                      {activity.metadata.completedCount && (
                        <span>Completed: {activity.metadata.completedCount}</span>
                      )}
                      {activity.metadata.importedCount && (
                        <span>Imported: {activity.metadata.importedCount}</span>
                      )}
                    </div>
                  )}

                  {getActionButton(activity)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}