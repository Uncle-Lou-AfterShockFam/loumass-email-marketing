'use client'

import { useState } from 'react'

interface StepMetric {
  stepId: string
  stepNumber: number
  type: string
  subject?: string
  trackingEnabled: boolean
  recipientsAtStep: number
  emailsSent: number
  opens: number
  clicks: number
  replies: number
  dropOff: number
  openRate: number
  clickRate: number
  replyRate: number
}

interface StepPerformanceProps {
  steps: StepMetric[]
  trackingEnabled: boolean
}

export default function StepPerformance({ steps, trackingEnabled }: StepPerformanceProps) {
  const [sortBy, setSortBy] = useState<'step' | 'opens' | 'clicks' | 'replies'>('step')
  const [showOnlyEmails, setShowOnlyEmails] = useState(false)

  const filteredSteps = showOnlyEmails 
    ? steps.filter(s => s.type === 'email')
    : steps

  const sortedSteps = [...filteredSteps].sort((a, b) => {
    switch (sortBy) {
      case 'opens':
        return b.openRate - a.openRate
      case 'clicks':
        return b.clickRate - a.clickRate
      case 'replies':
        return b.replyRate - a.replyRate
      default:
        return a.stepNumber - b.stepNumber
    }
  })

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'email':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )
      case 'delay':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'condition':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        )
      default:
        return null
    }
  }

  const getPerformanceColor = (rate: number) => {
    if (rate >= 30) return 'text-green-600'
    if (rate >= 15) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="mt-8 bg-white rounded-lg shadow dark:shadow-lg">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Step Performance</h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showOnlyEmails}
                onChange={(e) => setShowOnlyEmails(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
              />
              <span className="text-sm text-gray-600">Email steps only</span>
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="step">Sort by Step</option>
              {trackingEnabled && (
                <>
                  <option value="opens">Sort by Open Rate</option>
                  <option value="clicks">Sort by Click Rate</option>
                </>
              )}
              <option value="replies">Sort by Reply Rate</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Step
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Recipients
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Sent
              </th>
              {trackingEnabled && (
                <>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Opens
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Clicks
                  </th>
                </>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Replies
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Drop-off
              </th>
              {trackingEnabled && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Engagement
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedSteps.map((step) => (
              <tr key={step.stepId} className="hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className={`mr-3 ${
                      step.type === 'email' ? 'text-blue-600' :
                      step.type === 'delay' ? 'text-yellow-600' :
                      'text-purple-600'
                    }`}>
                      {getStepIcon(step.type)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Step {step.stepNumber}
                      </div>
                      {step.subject && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs">
                          {step.subject}
                        </div>
                      )}
                      {!step.trackingEnabled && step.type === 'email' && (
                        <span className="text-xs text-gray-400">
                          (Tracking disabled)
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {step.recipientsAtStep.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {step.type === 'email' ? step.emailsSent.toLocaleString() : '-'}
                </td>
                {trackingEnabled && (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {step.type === 'email' && step.trackingEnabled ? (
                        <div>
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {step.opens.toLocaleString()}
                          </div>
                          <div className={`text-xs ${getPerformanceColor(step.openRate)}`}>
                            {step.openRate}%
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {step.type === 'email' && step.trackingEnabled ? (
                        <div>
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {step.clicks.toLocaleString()}
                          </div>
                          <div className={`text-xs ${getPerformanceColor(step.clickRate)}`}>
                            {step.clickRate}%
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </>
                )}
                <td className="px-6 py-4 whitespace-nowrap">
                  {step.type === 'email' ? (
                    <div>
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {step.replies.toLocaleString()}
                      </div>
                      <div className={`text-xs ${getPerformanceColor(step.replyRate)}`}>
                        {step.replyRate}%
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {step.dropOff > 0 ? (
                    <div className="text-sm text-red-600">
                      -{step.dropOff.toLocaleString()}
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                {trackingEnabled && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {step.type === 'email' && step.trackingEnabled ? (
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2 max-w-[100px]">
                          <div
                            className={`h-2 rounded-full ${
                              step.openRate >= 30 ? 'bg-green-500' :
                              step.openRate >= 15 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(step.openRate, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">
                          {Math.round((step.openRate + step.clickRate + step.replyRate) / 3)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Performance Summary */}
      <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Best Performing Step</h3>
            {(() => {
              const emailSteps = steps.filter(s => s.type === 'email')
              if (emailSteps.length === 0) return <p className="text-sm text-gray-600 dark:text-gray-400">No email steps</p>
              
              const best = emailSteps.reduce((prev, current) => {
                const prevScore = (prev.openRate + prev.clickRate + prev.replyRate) / 3
                const currentScore = (current.openRate + current.clickRate + current.replyRate) / 3
                return currentScore > prevScore ? current : prev
              })
              
              return (
                <div className="text-sm">
                  <p className="font-medium text-gray-900 dark:text-gray-100">Step {best.stepNumber}</p>
                  <p className="text-gray-600">{best.subject}</p>
                  <p className="text-green-600">
                    Avg. engagement: {Math.round((best.openRate + best.clickRate + best.replyRate) / 3)}%
                  </p>
                </div>
              )
            })()}
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Highest Drop-off</h3>
            {(() => {
              const maxDropOff = steps.reduce((prev, current) => 
                current.dropOff > prev.dropOff ? current : prev
              )
              
              return maxDropOff.dropOff > 0 ? (
                <div className="text-sm">
                  <p className="font-medium text-gray-900 dark:text-gray-100">After Step {maxDropOff.stepNumber - 1}</p>
                  <p className="text-red-600">
                    {maxDropOff.dropOff.toLocaleString()} recipients lost
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">No significant drop-off</p>
              )
            })()}
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Average Performance</h3>
            {(() => {
              const emailSteps = steps.filter(s => s.type === 'email')
              if (emailSteps.length === 0) return <p className="text-sm text-gray-600 dark:text-gray-400">No email steps</p>
              
              const avgOpen = emailSteps.reduce((sum, s) => sum + s.openRate, 0) / emailSteps.length
              const avgClick = emailSteps.reduce((sum, s) => sum + s.clickRate, 0) / emailSteps.length
              const avgReply = emailSteps.reduce((sum, s) => sum + s.replyRate, 0) / emailSteps.length
              
              return (
                <div className="text-sm space-y-1">
                  {trackingEnabled && (
                    <>
                      <p>Open Rate: <span className={`font-medium ${getPerformanceColor(avgOpen)}`}>
                        {Math.round(avgOpen)}%
                      </span></p>
                      <p>Click Rate: <span className={`font-medium ${getPerformanceColor(avgClick)}`}>
                        {Math.round(avgClick)}%
                      </span></p>
                    </>
                  )}
                  <p>Reply Rate: <span className={`font-medium ${getPerformanceColor(avgReply)}`}>
                    {Math.round(avgReply)}%
                  </span></p>
                </div>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}