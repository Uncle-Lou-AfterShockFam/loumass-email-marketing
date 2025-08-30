'use client'

interface RepliesStatsProps {
  stats: {
    totalReplies: number
    unreadReplies: number
    positiveReplies: number
    negativeReplies: number
    neutralReplies: number
    avgResponseTime: number
    responseRate: number
    sentimentScore: number
  }
}

export default function RepliesStats({ stats }: RepliesStatsProps) {
  const getSentimentPercentage = () => {
    const total = stats.positiveReplies + stats.negativeReplies + stats.neutralReplies
    if (total === 0) return { positive: 0, negative: 0, neutral: 0 }
    
    return {
      positive: (stats.positiveReplies / total) * 100,
      negative: (stats.negativeReplies / total) * 100,
      neutral: (stats.neutralReplies / total) * 100
    }
  }

  const sentimentPercentages = getSentimentPercentage()

  const formatResponseTime = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`
    } else if (hours < 24) {
      return `${hours.toFixed(1)}h`
    } else {
      return `${Math.round(hours / 24)}d`
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Replies */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Replies</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalReplies.toLocaleString()}</p>
            <div className="mt-2 flex items-center">
              <span className="text-sm text-gray-500">
                {stats.unreadReplies} unread
              </span>
              {stats.unreadReplies > 0 && (
                <div className="ml-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              )}
            </div>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Response Rate */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Response Rate</p>
            <p className="text-3xl font-bold text-gray-900">{stats.responseRate.toFixed(1)}%</p>
            <div className="mt-2">
              <div className="flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(stats.responseRate, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">
                  {stats.responseRate > 3 ? 'Excellent' : stats.responseRate > 1.5 ? 'Good' : 'Low'}
                </span>
              </div>
            </div>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Average Response Time */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
            <p className="text-3xl font-bold text-gray-900">{formatResponseTime(stats.avgResponseTime)}</p>
            <div className="mt-2 flex items-center">
              <span className="text-xs text-gray-500">
                {stats.avgResponseTime < 2 ? 'Very Fast' : stats.avgResponseTime < 8 ? 'Fast' : stats.avgResponseTime < 24 ? 'Moderate' : 'Slow'}
              </span>
              <div className={`ml-2 w-2 h-2 rounded-full ${
                stats.avgResponseTime < 2 ? 'bg-green-500' : 
                stats.avgResponseTime < 8 ? 'bg-yellow-500' : 
                stats.avgResponseTime < 24 ? 'bg-orange-500' : 'bg-red-500'
              }`} />
            </div>
          </div>
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Sentiment Score */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Sentiment Score</p>
            <p className="text-3xl font-bold text-gray-900">{(stats.sentimentScore * 100).toFixed(0)}%</p>
            <div className="mt-2">
              <div className="flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      stats.sentimentScore > 0.7 ? 'bg-green-500' : 
                      stats.sentimentScore > 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${stats.sentimentScore * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">
                  {stats.sentimentScore > 0.7 ? 'Positive' : stats.sentimentScore > 0.5 ? 'Mixed' : 'Negative'}
                </span>
              </div>
            </div>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            stats.sentimentScore > 0.7 ? 'bg-green-100' : 
            stats.sentimentScore > 0.5 ? 'bg-yellow-100' : 'bg-red-100'
          }`}>
            <svg className={`w-6 h-6 ${
              stats.sentimentScore > 0.7 ? 'text-green-600' : 
              stats.sentimentScore > 0.5 ? 'text-yellow-600' : 'text-red-600'
            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Detailed Sentiment Breakdown */}
      <div className="bg-white rounded-lg shadow p-6 md:col-span-2 lg:col-span-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Sentiment Breakdown</h3>
          <p className="text-sm text-gray-600">Distribution of reply sentiments</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Positive Replies */}
          <div className="flex items-center">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900">Positive</span>
                </div>
                <div className="text-sm text-gray-600">
                  {stats.positiveReplies} ({sentimentPercentages.positive.toFixed(1)}%)
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${sentimentPercentages.positive}%` }}
                />
              </div>
            </div>
          </div>

          {/* Neutral Replies */}
          <div className="flex items-center">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900">Neutral</span>
                </div>
                <div className="text-sm text-gray-600">
                  {stats.neutralReplies} ({sentimentPercentages.neutral.toFixed(1)}%)
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${sentimentPercentages.neutral}%` }}
                />
              </div>
            </div>
          </div>

          {/* Negative Replies */}
          <div className="flex items-center">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900">Negative</span>
                </div>
                <div className="text-sm text-gray-600">
                  {stats.negativeReplies} ({sentimentPercentages.negative.toFixed(1)}%)
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${sentimentPercentages.negative}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="font-semibold text-blue-900">Reply Insights</h4>
              <p className="text-blue-800 text-sm mt-1">
                {stats.sentimentScore > 0.7 
                  ? `Excellent sentiment! ${sentimentPercentages.positive.toFixed(0)}% of replies are positive, indicating strong audience engagement and message resonance.`
                  : stats.sentimentScore > 0.5
                  ? `Mixed sentiment detected. Consider analyzing negative replies to improve future campaigns. Focus on addressing common concerns.`
                  : `High negative sentiment requires immediate attention. Review recent campaigns and consider pausing outreach until issues are addressed.`
                }
                {stats.avgResponseTime < 4 && ' Your fast response time is helping maintain engagement.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}