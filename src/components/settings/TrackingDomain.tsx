'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface TrackingDomainProps {
  domain: {
    id: string
    domain: string
    verified: boolean
    cnameTarget: string
  } | null
  userId: string
}

export default function TrackingDomain({ domain, userId }: TrackingDomainProps) {
  const router = useRouter()
  const [isAdding, setIsAdding] = useState(false)
  const [newDomain, setNewDomain] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newDomain.trim()) return

    setIsAdding(true)
    try {
      const response = await fetch('/api/tracking/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain.trim() })
      })

      if (response.ok) {
        setNewDomain('')
        router.refresh()
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to add domain')
      }
    } catch (error) {
      alert('An error occurred. Please try again.')
    } finally {
      setIsAdding(false)
    }
  }

  const handleVerifyDomain = async () => {
    if (!domain) return

    setIsVerifying(true)
    try {
      const response = await fetch(`/api/tracking/domain/${domain.id}/verify`, {
        method: 'POST'
      })

      if (response.ok) {
        router.refresh()
      } else {
        const error = await response.json()
        alert(error.message || 'Domain verification failed. Please check your DNS settings.')
      }
    } catch (error) {
      alert('An error occurred. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleRemoveDomain = async () => {
    if (!domain || !confirm('Are you sure you want to remove this tracking domain?')) {
      return
    }

    try {
      const response = await fetch(`/api/tracking/domain/${domain.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.refresh()
      } else {
        alert('Failed to remove domain')
      }
    } catch (error) {
      alert('An error occurred. Please try again.')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Tracking Domain</h2>
      
      {domain ? (
        <div>
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{domain.domain}</p>
                <div className="flex items-center mt-1">
                  {domain.verified ? (
                    <>
                      <svg className="h-4 w-4 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-green-600">Verified</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-yellow-600">Pending verification</span>
                    </>
                  )}
                </div>
              </div>
              <div className="space-x-2">
                {!domain.verified && (
                  <button
                    onClick={handleVerifyDomain}
                    disabled={isVerifying}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 border border-blue-300 rounded-md hover:bg-blue-50"
                  >
                    {isVerifying ? 'Verifying...' : 'Verify'}
                  </button>
                )}
                <button
                  onClick={handleRemoveDomain}
                  className="px-3 py-1 text-sm text-red-600 hover:text-red-700 border border-red-300 rounded-md hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>

          {!domain.verified && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">DNS Configuration Required</h3>
              <p className="text-sm text-blue-800 mb-3">
                Add the following CNAME records to your domain's DNS settings:
              </p>
              <div className="bg-white rounded border border-blue-200 p-3 font-mono text-xs">
                <div className="mb-2">
                  <span className="text-gray-600">Type:</span> CNAME<br/>
                  <span className="text-gray-600">Name:</span> track<br/>
                  <span className="text-gray-600">Value:</span> {domain.cnameTarget || 'tracking.loumass.com'}
                </div>
                <div>
                  <span className="text-gray-600">Type:</span> CNAME<br/>
                  <span className="text-gray-600">Name:</span> click<br/>
                  <span className="text-gray-600">Value:</span> {domain.cnameTarget || 'tracking.loumass.com'}
                </div>
              </div>
              <p className="text-xs text-blue-700 mt-3">
                DNS changes can take up to 48 hours to propagate. Click "Verify" to check the status.
              </p>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleAddDomain}>
          <p className="text-sm text-gray-600 mb-4">
            Add a custom domain for tracking email opens and clicks. This improves deliverability and provides branded tracking links.
          </p>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="tracking.yourdomain.com"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={isAdding || !newDomain.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAdding ? 'Adding...' : 'Add Domain'}
            </button>
          </div>
          
          <p className="text-xs text-gray-500 mt-2">
            Example: track.yourdomain.com or email.yourdomain.com
          </p>
        </form>
      )}
    </div>
  )
}