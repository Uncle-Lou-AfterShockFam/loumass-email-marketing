'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface GmailConnectionProps {
  isConnected: boolean
  email?: string | null
}

export default function GmailConnection({ isConnected, email }: GmailConnectionProps) {
  const router = useRouter()
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  const handleConnect = () => {
    window.location.href = '/api/auth/gmail/connect'
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Gmail account? This will stop all email sending.')) {
      return
    }

    setIsDisconnecting(true)
    try {
      const response = await fetch('/api/auth/gmail/disconnect', {
        method: 'POST'
      })

      if (response.ok) {
        router.refresh()
      } else {
        alert('Failed to disconnect Gmail. Please try again.')
      }
    } catch (error) {
      alert('An error occurred. Please try again.')
    } finally {
      setIsDisconnecting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Gmail Connection</h2>
      
      {isConnected ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-10 w-10 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Connected to Gmail</p>
                <p className="text-sm text-gray-500">{email}</p>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="px-4 py-2 text-sm text-red-600 hover:text-red-700 border border-red-300 rounded-md hover:bg-red-50 transition disabled:opacity-50"
            >
              {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <p className="text-sm text-green-800">
              ✓ Your Gmail account is connected and ready to send emails
            </p>
          </div>
        </div>
      ) : (
        <div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
            <div className="flex">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Gmail not connected</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Connect your Gmail account to start sending campaigns
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleConnect}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Connect Gmail Account
          </button>

          <p className="text-xs text-gray-500 mt-3 text-center">
            We'll request permission to send emails on your behalf using Gmail API
          </p>
        </div>
      )}
    </div>
  )
}