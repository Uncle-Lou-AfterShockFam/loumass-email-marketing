'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Save, Trash2, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function OAuthCredentials() {
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [isConfigured, setIsConfigured] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showSecret, setShowSecret] = useState(false)

  useEffect(() => {
    fetchCredentials()
  }, [])

  const fetchCredentials = async () => {
    try {
      const response = await fetch('/api/user/oauth-credentials')
      if (response.ok) {
        const data = await response.json()
        setClientId(data.googleClientId || '')
        setIsConfigured(data.oauthConfigured)
      }
    } catch (error) {
      console.error('Failed to fetch credentials:', error)
    }
  }

  const handleSave = async () => {
    if (!clientId || !clientSecret) {
      toast.error('Please enter both Client ID and Client Secret')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/user/oauth-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleClientId: clientId, googleClientSecret: clientSecret })
      })

      if (response.ok) {
        toast.success('OAuth credentials saved successfully!')
        setIsConfigured(true)
        setClientSecret('') // Clear secret after saving
        setShowSecret(false)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save credentials')
      }
    } catch (error) {
      toast.error('Failed to save credentials')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove your OAuth credentials?')) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/user/oauth-credentials', {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('OAuth credentials removed')
        setClientId('')
        setClientSecret('')
        setIsConfigured(false)
      } else {
        toast.error('Failed to remove credentials')
      }
    } catch (error) {
      toast.error('Failed to remove credentials')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Google OAuth Credentials
        </CardTitle>
        <CardDescription>
          Configure your own Google OAuth credentials to send emails from your Gmail account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConfigured && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              OAuth credentials are configured and active
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>How to get your OAuth credentials:</strong>
              <ol className="mt-2 space-y-1 text-sm">
                <li>1. Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                  Google Cloud Console <ExternalLink className="h-3 w-3" />
                </a></li>
                <li>2. Create a new project or select existing</li>
                <li>3. Enable Gmail API</li>
                <li>4. Create OAuth 2.0 credentials (Web application)</li>
                <li>5. Add these redirect URIs:
                  <ul className="ml-4 mt-1 font-mono text-xs">
                    <li>• https://loumassbeta.vercel.app/api/auth/callback/google</li>
                    <li>• http://localhost:3000/api/auth/callback/google (for testing)</li>
                  </ul>
                </li>
                <li>6. Copy your Client ID and Client Secret below</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="clientId">Client ID</Label>
            <Input
              id="clientId"
              type="text"
              placeholder="1234567890-abcdef.apps.googleusercontent.com"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientSecret">Client Secret</Label>
            <div className="relative">
              <Input
                id="clientSecret"
                type={showSecret ? 'text' : 'password'}
                placeholder="GOCSPX-xxxxxxxxxxxxx"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                className="font-mono text-sm pr-20"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2 top-2 text-sm text-gray-500 hover:text-gray-700"
              >
                {showSecret ? 'Hide' : 'Show'}
              </button>
            </div>
            {isConfigured && !clientSecret && (
              <p className="text-sm text-gray-500">
                Client Secret is already saved. Enter a new one to update it.
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={isLoading || (!clientId && !clientSecret)}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Credentials
            </Button>
            {isConfigured && (
              <Button
                onClick={handleRemove}
                disabled={isLoading}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            )}
          </div>

          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-800 text-sm">
              <strong>Required OAuth Scopes:</strong>
              <ul className="mt-1 space-y-0.5 text-xs font-mono">
                <li>• https://www.googleapis.com/auth/gmail.send</li>
                <li>• https://www.googleapis.com/auth/gmail.readonly</li>
                <li>• https://www.googleapis.com/auth/gmail.modify</li>
                <li>• https://www.googleapis.com/auth/userinfo.email</li>
                <li>• https://www.googleapis.com/auth/userinfo.profile</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  )
}