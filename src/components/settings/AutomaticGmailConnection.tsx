'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, CheckCircle2, AlertCircle, ExternalLink, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface GmailConnectionStatus {
  connected: boolean
  email?: string
  connectedAt?: string
  tokenExpiry?: string
}

export default function AutomaticGmailConnection() {
  const [status, setStatus] = useState<GmailConnectionStatus>({ connected: false })
  const [isLoading, setIsLoading] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)

  useEffect(() => {
    checkGmailConnection()
  }, [])

  const checkGmailConnection = async () => {
    try {
      const response = await fetch('/api/auth/gmail/status')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error('Failed to check Gmail connection:', error)
    } finally {
      setCheckingStatus(false)
    }
  }

  const handleConnect = async () => {
    setIsLoading(true)
    try {
      // Redirect to Gmail connection endpoint
      window.location.href = '/api/auth/gmail/connect'
    } catch (error) {
      toast.error('Failed to initiate Gmail connection')
      setIsLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Gmail? This will stop all email sending capabilities.')) {
      return
    }

    try {
      const response = await fetch('/api/auth/gmail/disconnect', {
        method: 'POST'
      })

      if (response.ok) {
        toast.success('Gmail disconnected successfully')
        setStatus({ connected: false })
      } else {
        toast.error('Failed to disconnect Gmail')
      }
    } catch (error) {
      toast.error('Failed to disconnect Gmail')
    }
  }

  if (checkingStatus) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          <span className="ml-2 text-gray-600">Checking Gmail connection...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Gmail Connection
        </CardTitle>
        <CardDescription>
          Connect your Gmail account to send emails through LOUMASS. We handle all the OAuth setup automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.connected ? (
          <>
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="space-y-1">
                  <div><strong>Gmail Connected:</strong> {status.email}</div>
                  {status.connectedAt && (
                    <div className="text-sm">Connected on {new Date(status.connectedAt).toLocaleDateString()}</div>
                  )}
                  {status.tokenExpiry && (
                    <div className="text-sm">Token expires: {new Date(status.tokenExpiry).toLocaleDateString()}</div>
                  )}
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                onClick={handleConnect}
                disabled={isLoading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Refresh Connection
              </Button>
              <Button
                onClick={handleDisconnect}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Disconnect Gmail
              </Button>
            </div>
          </>
        ) : (
          <>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div><strong>Gmail Not Connected</strong></div>
                  <div className="text-sm">
                    Connect your Gmail account to start sending emails. We use Google OAuth2 with the following permissions:
                  </div>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• Send emails from your Gmail account</li>
                    <li>• Read your Gmail messages (for reply tracking)</li>
                    <li>• Access your email address and profile</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleConnect}
              disabled={isLoading}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Connect Gmail Account
            </Button>
          </>
        )}

        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription className="text-blue-800 text-sm">
            <div className="space-y-2">
              <div><strong>🚀 Automatic Setup!</strong></div>
              <div>
                No more manual OAuth configuration needed. We handle all the technical setup automatically:
              </div>
              <ul className="space-y-0.5 text-xs">
                <li>• Pre-configured Google Cloud OAuth application</li>
                <li>• Automatic token refresh to prevent expiration</li>
                <li>• Secure credential management</li>
                <li>• No Client ID or Secret needed from you</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}