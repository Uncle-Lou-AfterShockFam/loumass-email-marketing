'use client'

import { useState } from 'react'

interface FunnelStep {
  step: string
  subject: string
  recipients: number
  sent: number
  opened: number
  clicked: number
  replied: number
}

interface SequenceFunnelProps {
  funnelData: FunnelStep[]
  trackingEnabled: boolean
}

export default function SequenceFunnel({ funnelData, trackingEnabled }: SequenceFunnelProps) {
  const [selectedStep, setSelectedStep] = useState<FunnelStep | null>(null)

  if (funnelData.length === 0) {
    return (
      <div className="mt-8 bg-white rounded-lg shadow dark:shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Sequence Funnel</h2>
        <p className="text-gray-600 dark:text-gray-400 text-center py-8">No email steps to display</p>
      </div>
    )
  }

  const maxRecipients = Math.max(...funnelData.map(d => d.recipients))

  const getPercentage = (value: number) => {
    return maxRecipients > 0 ? (value / maxRecipients) * 100 : 0
  }

  const getStepMetrics = (step: FunnelStep) => {
    const metrics = [
      { label: 'Recipients', value: step.recipients, color: 'text-blue-600' },
      { label: 'Sent', value: step.sent, color: 'text-green-600' }
    ]

    if (trackingEnabled) {
      metrics.push(
        { label: 'Opened', value: step.opened, color: 'text-purple-600' },
        { label: 'Clicked', value: step.clicked, color: 'text-indigo-600' }
      )
    }

    metrics.push({ label: 'Replied', value: step.replied, color: 'text-teal-600' })

    return metrics
  }

  return (
    <div className="mt-8 bg-white rounded-lg shadow dark:shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Sequence Funnel</h2>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Recipients</span>
          </div>
          {trackingEnabled && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded"></div>
                <span>Opened</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-500 rounded"></div>
                <span>Clicked</span>
              </div>
            </>
          )}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-teal-500 rounded"></div>
            <span>Replied</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {funnelData.map((step, index) => {
          const recipientWidth = getPercentage(step.recipients)
          const openWidth = trackingEnabled ? getPercentage(step.opened) : 0
          const clickWidth = trackingEnabled ? getPercentage(step.clicked) : 0
          const replyWidth = getPercentage(step.replied)
          
          const dropOff = index > 0 
            ? funnelData[index - 1].recipients - step.recipients
            : 0
          const dropOffPercentage = index > 0 && funnelData[index - 1].recipients > 0
            ? Math.round((dropOff / funnelData[index - 1].recipients) * 100)
            : 0

          return (
            <div key={step.step}>
              {index > 0 && dropOff > 0 && (
                <div className="flex items-center justify-center py-2">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    {dropOff.toLocaleString()} drop-off ({dropOffPercentage}%)
                  </div>
                </div>
              )}
              
              <div 
                className="cursor-pointer hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg p-4 transition"
                onClick={() => setSelectedStep(step)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{step.step}</h3>
                    <p className="text-sm text-gray-600">{step.subject}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {step.recipients.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">recipients</p>
                  </div>
                </div>

                <div className="relative">
                  {/* Background bar */}
                  <div className="h-8 bg-gray-100 rounded-full overflow-hidden">
                    {/* Recipients bar */}
                    <div
                      className="absolute top-0 left-0 h-full bg-blue-500 opacity-30 rounded-full transition-all duration-500"
                      style={{ width: `${recipientWidth}%` }}
                    />
                    
                    {/* Opened bar */}
                    {trackingEnabled && openWidth > 0 && (
                      <div
                        className="absolute top-0 left-0 h-full bg-purple-500 opacity-50 rounded-full transition-all duration-500"
                        style={{ width: `${openWidth}%` }}
                      />
                    )}
                    
                    {/* Clicked bar */}
                    {trackingEnabled && clickWidth > 0 && (
                      <div
                        className="absolute top-0 left-0 h-full bg-indigo-500 opacity-60 rounded-full transition-all duration-500"
                        style={{ width: `${clickWidth}%` }}
                      />
                    )}
                    
                    {/* Replied bar */}
                    {replyWidth > 0 && (
                      <div
                        className="absolute top-0 left-0 h-full bg-teal-500 opacity-70 rounded-full transition-all duration-500"
                        style={{ width: `${replyWidth}%` }}
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 text-sm">
                  <div className="flex items-center gap-4">
                    <span className="text-gray-600">
                      Sent: <span className="font-medium text-gray-900 dark:text-gray-100">{step.sent.toLocaleString()}</span>
                    </span>
                    {trackingEnabled && (
                      <>
                        <span className="text-gray-600">
                          Opened: <span className="font-medium text-purple-600">{step.opened.toLocaleString()}</span>
                        </span>
                        <span className="text-gray-600">
                          Clicked: <span className="font-medium text-indigo-600">{step.clicked.toLocaleString()}</span>
                        </span>
                      </>
                    )}
                    <span className="text-gray-600">
                      Replied: <span className="font-medium text-teal-600">{step.replied.toLocaleString()}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {trackingEnabled && step.sent > 0 && (
                      <>
                        <span className="text-xs text-purple-600">
                          {Math.round((step.opened / step.sent) * 100)}% open rate
                        </span>
                        <span className="text-xs text-indigo-600">
                          {Math.round((step.clicked / step.sent) * 100)}% click rate
                        </span>
                      </>
                    )}
                    {step.sent > 0 && (
                      <span className="text-xs text-teal-600">
                        {Math.round((step.replied / step.sent) * 100)}% reply rate
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail Modal */}
      {selectedStep && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedStep(null)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selectedStep.step}</h3>
              <button
                onClick={() => setSelectedStep(null)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-400"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">{selectedStep.subject}</p>
            
            <div className="space-y-3">
              {getStepMetrics(selectedStep).map((metric) => (
                <div key={metric.label} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{metric.label}</span>
                  <span className={`text-lg font-semibold ${metric.color}`}>
                    {metric.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Conversion Rates</h4>
              <div className="space-y-2">
                {selectedStep.sent > 0 && (
                  <>
                    {trackingEnabled && (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Open Rate</span>
                          <span className="font-medium text-purple-600">
                            {Math.round((selectedStep.opened / selectedStep.sent) * 100)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Click Rate</span>
                          <span className="font-medium text-indigo-600">
                            {Math.round((selectedStep.clicked / selectedStep.sent) * 100)}%
                          </span>
                        </div>
                      </>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Reply Rate</span>
                      <span className="font-medium text-teal-600">
                        {Math.round((selectedStep.replied / selectedStep.sent) * 100)}%
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}