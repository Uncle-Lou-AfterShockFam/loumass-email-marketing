'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session) {
      router.push('/dashboard')
    }
  }, [session, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (session) {
    return null // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">LOUMASS</h1>
              <span className="ml-2 text-sm text-gray-500">v0.1.0</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/auth/signin">
                <Button variant="outline">Sign In</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Professional Email Marketing
            <span className="text-blue-600"> Made Simple</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            A powerful GMASS alternative built for modern email marketing campaigns, 
            automated sequences, and real-time analytics.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/auth/signin">
              <Button size="lg" className="text-lg px-8 py-3">
                Get Started Now
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="text-lg px-8 py-3">
              Learn More
            </Button>
          </div>

          {/* Status Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-100 text-green-800 text-sm font-medium">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            System Online - Ready for Testing
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Everything You Need for Email Marketing
          </h2>
          <p className="text-xl text-gray-600">
            Built with modern technology and designed for performance
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                📧 Campaign Management
              </CardTitle>
              <CardDescription>
                Create and manage email campaigns with advanced targeting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>✅ Visual email editor</li>
                <li>✅ Template library</li>
                <li>✅ A/B testing</li>
                <li>✅ Scheduling</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                ⚡ Automated Sequences
              </CardTitle>
              <CardDescription>
                Build automated follow-up sequences with conditional logic
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>✅ Drag & drop builder</li>
                <li>✅ Smart triggers</li>
                <li>✅ Conditional branching</li>
                <li>✅ Performance tracking</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                📊 Real-time Analytics
              </CardTitle>
              <CardDescription>
                Track opens, clicks, conversions, and more
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>✅ Open & click tracking</li>
                <li>✅ Conversion metrics</li>
                <li>✅ Engagement reports</li>
                <li>✅ Revenue attribution</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Demo Section */}
      <div className="bg-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Test?</h2>
          <p className="text-xl mb-8 opacity-90">
            Demo the system with our test account and see the email functionality in action
          </p>
          
          <div className="bg-blue-700 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4">Demo Credentials</h3>
            <div className="text-left space-y-2 max-w-md mx-auto">
              <p><strong>Email:</strong> ljpiotti@aftershockfam.org</p>
              <p><strong>Password:</strong> Any password works for demo</p>
              <p><strong>Test Email Target:</strong> lou@soberafe.com</p>
            </div>
          </div>

          <Link href="/auth/signin">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
              Try Demo Now
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-4">LOUMASS</h3>
          <p className="mb-4">Professional Email Marketing Platform</p>
          <p className="text-sm text-gray-500">
            Built with Next.js, TypeScript, PostgreSQL, and Redis
          </p>
        </div>
      </footer>
    </div>
  )
}