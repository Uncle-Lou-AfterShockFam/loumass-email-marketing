'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

interface ReplyTrackingStatus {
  connected: boolean
  watchActive: boolean
  watchExpiry?: string
  lastHistoryId?: string
  email?: string
}

interface CheckResult {
  repliesFound: number
  message: string
  replies?: Array<{
    campaignName: string
    contactEmail: string
    subject: string
    date: string
  }>
}

export default function ReplyTrackingCard() {
  const [status, setStatus] = useState<ReplyTrackingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/gmail/watch')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error('Failed to check reply tracking status:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkForReplies = async () => {
    setChecking(true)
    setError(null)
    setCheckResult(null)

    try {
      const response = await fetch('/api/gmail/check-replies', {
        method: 'POST'
      })

      const data = await response.json()

      if (response.ok) {
        setLastChecked(new Date())
        setCheckResult(data)
        
        // Refresh the page after a short delay to show the new reply events
        if (data.repliesFound > 0) {
          setTimeout(() => {
            window.location.reload()
          }, 2000)
        }
      } else {
        setError(data.error || 'Failed to check for replies')
      }
    } catch (error) {
      setError('An error occurred while checking for replies')
    } finally {
      setChecking(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Reply Tracking</h3>
        {status?.watchActive && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Active
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {!status?.connected ? (
        <div className="text-center py-4">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="mt-2 text-sm text-gray-500">Gmail not connected</p>
          <p className="text-xs text-gray-400 mt-1">Connect your Gmail account to enable reply tracking</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center text-sm">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-700">Gmail Connected: {status.email}</span>
              </div>
              {lastChecked && (
                <p className="text-xs text-gray-500 ml-7">
                  Last checked: {format(lastChecked, 'MMM d, h:mm a')}
                </p>
              )}
            </div>
          </div>

          {checkResult && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <p className="text-sm text-gray-700">{checkResult.message}</p>
              {checkResult.repliesFound > 0 && (
                <>
                  <p className="text-sm font-medium text-green-600">
                    Found {checkResult.repliesFound} new {checkResult.repliesFound === 1 ? 'reply' : 'replies'}!
                  </p>
                  {checkResult.replies && checkResult.replies.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {checkResult.replies.map((reply, idx) => (
                        <div key={idx} className="text-xs text-gray-600">
                          • {reply.contactEmail} replied to "{reply.campaignName}"
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <button
            onClick={checkForReplies}
            disabled={checking}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checking ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Checking for Replies...
              </>
            ) : (
              <>
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Check for Replies
              </>
            )}
          </button>

          <div className="text-xs text-gray-500 space-y-1">
            <p>• Checks your Gmail inbox for replies to campaign emails</p>
            <p>• Updates recipient status when replies are detected</p>
            <p>• Click the button above to manually check for new replies</p>
          </div>
        </div>
      )}
    </div>
  )
}