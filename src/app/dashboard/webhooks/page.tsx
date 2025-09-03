'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-hot-toast'

interface Webhook {
  id: string
  name: string
  description?: string
  url: string
  events: string[]
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR'
  secretKey: string
  lastTriggered?: string
  totalCalls: number
  successfulCalls: number
  failedCalls: number
  createdAt: string
  updatedAt: string
}

export default function WebhooksPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.id) {
      router.push('/auth/signin')
      return
    }

    fetchWebhooks()
  }, [session, status, router])

  const fetchWebhooks = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/webhooks')
      
      if (!response.ok) {
        throw new Error('Failed to fetch webhooks')
      }

      const data = await response.json()
      setWebhooks(data.webhooks || [])
    } catch (error) {
      console.error('Error loading webhooks:', error)
      toast.error('Failed to load webhooks')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleWebhook = async (id: string, currentStatus: string) => {
    try {
      setProcessingId(id)
      const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
      
      const response = await fetch(`/api/webhooks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update webhook')
      }

      toast.success(`Webhook ${newStatus.toLowerCase()}`)
      await fetchWebhooks()
    } catch (error: any) {
      console.error('Error updating webhook:', error)
      toast.error(error.message || 'Failed to update webhook')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDeleteWebhook = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return
    }

    try {
      setProcessingId(id)
      const response = await fetch(`/api/webhooks/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete webhook')
      }

      toast.success('Webhook deleted')
      await fetchWebhooks()
    } catch (error: any) {
      console.error('Error deleting webhook:', error)
      toast.error(error.message || 'Failed to delete webhook')
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const classes = {
      'ACTIVE': 'bg-green-100 text-green-800',
      'INACTIVE': 'bg-gray-100 text-gray-800',
      'ERROR': 'bg-red-100 text-red-800'
    }[status] || 'bg-gray-100 text-gray-800'

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}>
        {status}
      </span>
    )
  }

  const formatLastTriggered = (dateString?: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    return `${Math.floor(diffInHours / 24)}d ago`
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Webhooks</h1>
          <p className="mt-2 text-gray-600">
            Manage webhook endpoints for receiving real-time notifications
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/webhooks/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Webhook
          </Link>
        </div>
      </div>

      {webhooks.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">🔗</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No webhooks configured</h3>
          <p className="text-gray-600 mb-4">
            Create webhooks to receive real-time notifications about events in your application
          </p>
          <Link
            href="/dashboard/webhooks/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Your First Webhook
          </Link>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Webhook
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Events
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statistics
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {webhooks.map((webhook) => (
                <tr key={webhook.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <Link
                        href={`/dashboard/webhooks/${webhook.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-500"
                      >
                        {webhook.name}
                      </Link>
                      {webhook.description && (
                        <p className="text-sm text-gray-500">{webhook.description}</p>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        Last triggered: {formatLastTriggered(webhook.lastTriggered)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded">
                      {webhook.url.length > 50 ? `${webhook.url.substring(0, 47)}...` : webhook.url}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.slice(0, 2).map((event) => (
                        <span
                          key={event}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {event}
                        </span>
                      ))}
                      {webhook.events.length > 2 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          +{webhook.events.length - 2} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(webhook.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>{webhook.totalCalls} total calls</div>
                      <div className="text-xs text-gray-500">
                        {webhook.successfulCalls} success • {webhook.failedCalls} failed
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleWebhook(webhook.id, webhook.status)}
                        disabled={processingId === webhook.id}
                        className={`inline-flex items-center px-3 py-1 border text-sm font-medium rounded-md disabled:opacity-50 ${
                          webhook.status === 'ACTIVE'
                            ? 'border-red-300 text-red-700 bg-white hover:bg-red-50'
                            : 'border-green-300 text-green-700 bg-white hover:bg-green-50'
                        }`}
                      >
                        {processingId === webhook.id ? '...' : webhook.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                      </button>
                      <Link
                        href={`/dashboard/webhooks/${webhook.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDeleteWebhook(webhook.id, webhook.name)}
                        disabled={processingId === webhook.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}