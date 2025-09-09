'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Settings, CheckCircle2, AlertCircle, ExternalLink, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface OAuthCredentials {
  clientId: string
  clientSecret: string
  configured: boolean
}

export default function OAuthSetup() {
  const [credentials, setCredentials] = useState<OAuthCredentials>({
    clientId: '',
    clientSecret: '',
    configured: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    loadCredentials()
  }, [])

  const loadCredentials = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/oauth/credentials')
      if (response.ok) {
        const data = await response.json()
        setCredentials({
          clientId: data.clientId || '',
          clientSecret: data.clientSecret || '',
          configured: data.configured || false
        })
      }
    } catch (error) {
      console.error('Failed to load OAuth credentials:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveCredentials = async () => {
    if (!credentials.clientId.trim() || !credentials.clientSecret.trim()) {
      toast.error('Please enter both Client ID and Client Secret')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/oauth/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientId: credentials.clientId.trim(),
          clientSecret: credentials.clientSecret.trim()
        })
      })

      if (response.ok) {
        toast.success('OAuth credentials saved successfully')
        setCredentials(prev => ({ ...prev, configured: true }))
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save credentials')
      }
    } catch (error) {
      toast.error('Failed to save credentials')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          <span className="ml-2 text-gray-600">Loading OAuth configuration...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Google OAuth Configuration
        </CardTitle>
        <CardDescription>
          Configure your own Google OAuth credentials to use Gmail integration. Each user must provide their own credentials for security.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {credentials.configured ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <div className="space-y-1">
                <div><strong>OAuth Configured:</strong> Your Google OAuth credentials are set up</div>
                <div className="text-sm">Client ID: {credentials.clientId.slice(0, 20)}...{credentials.clientId.slice(-10)}</div>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div><strong>OAuth Setup Required</strong></div>
                <div className="text-sm">
                  You need to configure your Google OAuth credentials before connecting Gmail. This ensures your email sending uses your own Google Cloud project.
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="clientId">Google Client ID</Label>
            <Input
              id="clientId"
              type="text"
              placeholder="123456789-abcdef.apps.googleusercontent.com"
              value={credentials.clientId}
              onChange={(e) => setCredentials(prev => ({ ...prev, clientId: e.target.value }))}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="clientSecret">Google Client Secret</Label>
            <Input
              id="clientSecret"
              type="password"
              placeholder="GOCSPX-abcdefghijklmnopqrstuvwxyz"
              value={credentials.clientSecret}
              onChange={(e) => setCredentials(prev => ({ ...prev, clientSecret: e.target.value }))}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={saveCredentials}
              disabled={isSaving || !credentials.clientId.trim() || !credentials.clientSecret.trim()}
              className="flex items-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Settings className="h-4 w-4" />
              )}
              {credentials.configured ? 'Update Credentials' : 'Save Credentials'}
            </Button>
            
            <Button
              onClick={() => setShowGuide(!showGuide)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              {showGuide ? 'Hide' : 'Show'} Setup Guide
            </Button>
          </div>
        </div>

        {showGuide && (
          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-800 text-sm">
              <div className="space-y-3">
                <div><strong>📋 How to Get Your OAuth Credentials:</strong></div>
                
                <div className="space-y-2">
                  <div><strong>1. Go to Google Cloud Console</strong></div>
                  <div className="text-xs">Visit: <code>https://console.cloud.google.com/</code></div>
                </div>
                
                <div className="space-y-2">
                  <div><strong>2. Create or Select a Project</strong></div>
                  <div className="text-xs">Create a new project or select an existing one</div>
                </div>
                
                <div className="space-y-2">
                  <div><strong>3. Enable Gmail API</strong></div>
                  <div className="text-xs">Go to "APIs & Services" → "Library" → Search "Gmail API" → Enable it</div>
                </div>
                
                <div className="space-y-2">
                  <div><strong>4. Create OAuth Consent Screen</strong></div>
                  <div className="text-xs">Go to "APIs & Services" → "OAuth consent screen" → Configure it</div>
                </div>
                
                <div className="space-y-2">
                  <div><strong>5. Create Credentials</strong></div>
                  <div className="text-xs">Go to "APIs & Services" → "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"</div>
                  <div className="text-xs">Application type: Web application</div>
                  <div className="text-xs">Authorized redirect URI: <code>{process.env.NEXT_PUBLIC_BASE_URL}/api/auth/gmail/callback</code></div>
                </div>
                
                <div className="space-y-2">
                  <div><strong>6. Copy Your Credentials</strong></div>
                  <div className="text-xs">Copy the Client ID and Client Secret and paste them above</div>
                </div>
                
                <div className="text-xs text-blue-600">
                  <strong>⚡ Required Scopes:</strong> Make sure to add these scopes to your OAuth consent screen:
                  <ul className="mt-1 space-y-0.5 ml-4">
                    <li>• https://www.googleapis.com/auth/gmail.send</li>
                    <li>• https://www.googleapis.com/auth/gmail.compose</li>
                    <li>• https://www.googleapis.com/auth/gmail.modify</li>
                    <li>• https://www.googleapis.com/auth/gmail.readonly</li>
                    <li>• https://www.googleapis.com/auth/userinfo.email</li>
                  </ul>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}