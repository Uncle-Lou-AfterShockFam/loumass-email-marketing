'use client'

import { useState } from 'react'

export default function UpdateReplyBodiesButton() {
  const [updating, setUpdating] = useState(false)
  const [result, setResult] = useState<any>(null)

  const updateReplyBodies = async () => {
    setUpdating(true)
    setResult(null)

    try {
      const response = await fetch('/api/gmail/update-reply-bodies', {
        method: 'POST'
      })

      const data = await response.json()
      setResult(data)
      
      if (response.ok && data.updatedCount > 0) {
        // Refresh the page after a short delay
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      }
    } catch (error) {
      setResult({ error: 'Failed to update reply bodies' })
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-2">Update Reply Bodies</h3>
      <p className="text-xs text-gray-500 mb-3">
        This will fetch message bodies for any replies that are missing content.
      </p>
      
      <button
        onClick={updateReplyBodies}
        disabled={updating}
        className="w-full px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50"
      >
        {updating ? 'Updating...' : 'Update Missing Reply Bodies'}
      </button>
      
      {result && (
        <div className={`mt-3 p-2 rounded text-xs ${result.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {result.error || result.message}
          {result.updatedCount !== undefined && (
            <div className="mt-1">
              Updated {result.updatedCount} of {result.totalReplies} replies
            </div>
          )}
        </div>
      )}
    </div>
  )
}