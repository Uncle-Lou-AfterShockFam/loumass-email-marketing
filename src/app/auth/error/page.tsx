'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const getErrorMessage = () => {
    switch (error) {
      case 'Configuration':
        return 'There is a problem with the server configuration.'
      case 'AccessDenied':
        return 'You do not have permission to sign in.'
      case 'Verification':
        return 'The verification token has expired or has already been used.'
      case 'OAuthSignin':
        return 'Error in constructing an authorization URL.'
      case 'OAuthCallback':
        return 'Error in handling the response from OAuth provider.'
      case 'OAuthCreateAccount':
        return 'Could not create OAuth account. Account may already exist with different sign in method.'
      case 'EmailCreateAccount':
        return 'Could not create email account. Account may already exist.'
      case 'Callback':
        return 'Error in the OAuth callback handler route.'
      case 'OAuthAccountNotLinked':
        return 'Email on the account is already linked to another account.'
      case 'EmailSignin':
        return 'The e-mail could not be sent.'
      case 'CredentialsSignin':
        return 'Sign in failed. Check the details you provided are correct.'
      case 'Default':
        return 'Unable to sign in.'
      default:
        return 'An unexpected error occurred during authentication.'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <h1 className="text-3xl font-bold text-blue-600">LOUMASS</h1>
          </div>
          <CardTitle className="text-2xl text-center">Authentication Error</CardTitle>
          <CardDescription className="text-center">
            Something went wrong during authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 text-red-600 p-4 rounded-md">
            <p className="text-sm font-medium mb-1">Error: {error || 'Unknown'}</p>
            <p className="text-sm">{getErrorMessage()}</p>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <p>Possible solutions:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Try signing in again</li>
              <li>Use a different sign in method</li>
              <li>Clear your browser cookies for this site</li>
              <li>Contact support if the issue persists</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button asChild className="w-full">
            <Link href="/auth/signin">
              Try Sign In Again
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/auth/signup">
              Create New Account
            </Link>
          </Button>
          <Link href="/" className="text-sm text-gray-600 hover:underline text-center">
            Back to Home
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center text-gray-500">Loading...</div>
          </CardContent>
        </Card>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  )
}