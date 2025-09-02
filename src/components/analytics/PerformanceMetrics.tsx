'use client'

interface PerformanceMetric {
  metric: string
  userValue: number
  industryValue: number
  improvement: number
  status: 'above' | 'below'
}

interface PerformanceMetricsProps {
  metrics: {
    industryBenchmarks: {
      deliveryRate: number
      openRate: number
      clickRate: number
      replyRate: number
      bounceRate: number
      unsubscribeRate: number
    }
    userPerformance: {
      deliveryRate: number
      openRate: number
      clickRate: number
      replyRate: number
      bounceRate: number
      unsubscribeRate: number
    }
    improvements: PerformanceMetric[]
  }
}

export default function PerformanceMetrics({ metrics }: PerformanceMetricsProps) {
  const getStatusColor = (status: string, metricName: string) => {
    const isNegativeMetric = metricName.toLowerCase().includes('bounce') || metricName.toLowerCase().includes('unsubscribe')
    
    if (isNegativeMetric) {
      return status === 'below' ? 'text-green-600' : 'text-red-600'
    } else {
      return status === 'above' ? 'text-green-600' : 'text-red-600'
    }
  }

  const getStatusIcon = (status: string, metricName: string) => {
    const isNegativeMetric = metricName.toLowerCase().includes('bounce') || metricName.toLowerCase().includes('unsubscribe')
    const isGood = isNegativeMetric ? status === 'below' : status === 'above'
    
    if (isGood) {
      return (
        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )
    } else {
      return (
        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      )
    }
  }

  const getProgressWidth = (userValue: number, industryValue: number, isNegativeMetric: boolean) => {
    if (isNegativeMetric) {
      // For negative metrics, lower is better
      const maxValue = Math.max(userValue, industryValue) * 1.2
      return {
        user: (userValue / maxValue) * 100,
        industry: (industryValue / maxValue) * 100
      }
    } else {
      // For positive metrics, higher is better
      const maxValue = Math.max(userValue, industryValue) * 1.2
      return {
        user: (userValue / maxValue) * 100,
        industry: (industryValue / maxValue) * 100
      }
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Performance vs Industry</h3>
            <p className="text-sm text-gray-600">How your email performance compares to industry benchmarks</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-2 bg-blue-500 rounded"></div>
              <span className="text-gray-600">Your Performance</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-2 bg-gray-300 rounded"></div>
              <span className="text-gray-600">Industry Average</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-8">
          {metrics.improvements.map((improvement, index) => {
            const isNegativeMetric = improvement.metric.toLowerCase().includes('bounce') || improvement.metric.toLowerCase().includes('unsubscribe')
            const progressWidths = getProgressWidth(improvement.userValue, improvement.industryValue, isNegativeMetric)
            
            return (
              <div key={index} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(improvement.status, improvement.metric)}
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{improvement.metric}</div>
                      <div className="text-sm text-gray-600">
                        {isNegativeMetric ? 'Lower is better' : 'Higher is better'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-semibold ${getStatusColor(improvement.status, improvement.metric)}`}>
                      {improvement.improvement.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {isNegativeMetric ? 'better' : 'improvement'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {/* User Performance Bar */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 text-sm text-gray-600">You</div>
                    <div className="flex-1 relative">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${progressWidths.user}%` }}
                        />
                      </div>
                      <div className="absolute right-0 top-0 -mt-6 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {improvement.userValue.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Industry Benchmark Bar */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 text-sm text-gray-600">Industry</div>
                    <div className="flex-1 relative">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gray-400 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${progressWidths.industry}%` }}
                        />
                      </div>
                      <div className="absolute right-0 top-0 -mt-6 text-sm font-medium text-gray-600">
                        {improvement.industryValue.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="font-semibold text-blue-900">Performance Insights</h4>
              <p className="text-blue-800 text-sm mt-1">
                You're outperforming industry averages in most key metrics. Your open rates and click rates are particularly strong, 
                indicating excellent content relevance and subject line effectiveness. Keep monitoring bounce rates to maintain 
                good sender reputation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}