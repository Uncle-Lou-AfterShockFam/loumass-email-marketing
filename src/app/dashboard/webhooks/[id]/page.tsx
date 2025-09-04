'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

const AVAILABLE_EVENTS = [
  { id: 'email.opened', label: 'Email Opened', description: 'Triggered when an email is opened' },
  { id: 'email.clicked', label: 'Email Clicked', description: 'Triggered when a link in an email is clicked' },
  { id: 'email.replied', label: 'Email Replied', description: 'Triggered when someone replies to an email' },
  { id: 'email.bounced', label: 'Email Bounced', description: 'Triggered when an email bounces' },
  { id: 'contact.subscribed', label: 'Contact Subscribed', description: 'Triggered when a contact subscribes' },
  { id: 'contact.unsubscribed', label: 'Contact Unsubscribed', description: 'Triggered when a contact unsubscribes' },
  { id: 'automation.started', label: 'Automation Started', description: 'Triggered when an automation is started' },
  { id: 'automation.completed', label: 'Automation Completed', description: 'Triggered when an automation is completed' },
  { id: 'campaign.sent', label: 'Campaign Sent', description: 'Triggered when a campaign is sent' }
]

interface Webhook {
  id: string
  name: string
  description?: string
  url: string
  events: string[]
  status: string
  secretKey: string
  lastTriggered?: string
  totalCalls: number
  successfulCalls: number
  failedCalls: number
  createdAt: string
  updatedAt: string
}

interface WebhookCall {
  id: string
  event: string
  status: 'SUCCESS' | 'FAILED'
  responseCode?: number
  responseTime?: number
  payload: any
  response?: string
  error?: string
  timestamp: string
}

export default function WebhookDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [webhookId, setWebhookId] = useState<string | null>(null)
  
  const [webhook, setWebhook] = useState<Webhook | null>(null)
  const [calls, setCalls] = useState<WebhookCall[]>([])
  const [activeTab, setActiveTab] = useState<'settings' | 'calls'>('settings')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    url: '',
    events: [] as string[],
    status: 'ACTIVE'
  })

  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params
      setWebhookId(resolvedParams.id)
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    if (status === 'loading' || !webhookId) return
    if (!session?.user?.id) {
      router.push('/auth/signin')
      return
    }

    fetchWebhook()
    fetchWebhookCalls()
  }, [webhookId, session, status, router])

  const fetchWebhook = async () => {
    if (!webhookId) return
    try {
      setLoading(true)
      const response = await fetch(`/api/webhooks/${webhookId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Webhook not found')
          router.push('/dashboard/webhooks')
          return
        }
        throw new Error('Failed to fetch webhook')
      }

      const data = await response.json()
      const webhookData = data.webhook
      
      setWebhook(webhookData)
      setFormData({
        name: webhookData.name,
        description: webhookData.description || '',
        url: webhookData.url,
        events: webhookData.events,
        status: webhookData.status
      })
    } catch (error) {
      console.error('Error loading webhook:', error)
      toast.error('Failed to load webhook')
    } finally {
      setLoading(false)
    }
  }

  const fetchWebhookCalls = async () => {
    if (!webhookId) return
    try {
      const response = await fetch(`/api/webhooks/${webhookId}/calls`)
      
      if (response.ok) {
        const data = await response.json()
        setCalls(data.calls || [])
      }
    } catch (error) {
      console.error('Error loading webhook calls:', error)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.url.trim()) {
      newErrors.url = 'URL is required'
    } else {
      try {
        new URL(formData.url)
      } catch {
        newErrors.url = 'Please enter a valid URL'
      }
    }

    if (formData.events.length === 0) {
      newErrors.events = 'Please select at least one event'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm() || !webhookId) {
      return
    }

    try {
      setSaving(true)
      const response = await fetch(`/api/webhooks/${webhookId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update webhook')
      }

      const result = await response.json()
      setWebhook(result.webhook)
      toast.success('Webhook updated successfully')
    } catch (error: any) {
      console.error('Error updating webhook:', error)
      toast.error(error.message || 'Failed to update webhook')
    } finally {
      setSaving(false)
    }
  }

  const handleTestWebhook = async () => {
    if (!webhookId) return
    try {
      setSaving(true)
      const response = await fetch(`/api/webhooks/${webhookId}/test`, {
        method: 'POST'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to test webhook')
      }

      toast.success('Test webhook sent successfully')
      await fetchWebhookCalls()
    } catch (error: any) {
      console.error('Error testing webhook:', error)
      toast.error(error.message || 'Failed to test webhook')
    } finally {
      setSaving(false)
    }
  }

  const handleEventToggle = (eventId: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(id => id !== eventId)
        : [...prev.events, eventId]
    }))
  }

  const copySecretKey = () => {
    if (webhook?.secretKey) {
      navigator.clipboard.writeText(webhook.secretKey)
      toast.success('Secret key copied to clipboard')
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!webhook) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900">Webhook not found</h2>
        <p className="mt-2 text-gray-600">The webhook you're looking for doesn't exist.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{webhook.name}</h1>
          <p className="mt-2 text-gray-600">
            Manage webhook settings and view call history
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleTestWebhook}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            {saving ? 'Testing...' : 'Test Webhook'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Settings
            </button>
            <button
              onClick={() => setActiveTab('calls')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'calls'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Call History ({calls.length})
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'settings' ? (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 bg-white ${
                    errors.name ? 'border-red-300' : ''
                  }`}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 bg-white"
                />
              </div>

              <div>
                <label htmlFor="url" className="block text-sm font-medium text-gray-700">
                  Endpoint URL
                </label>
                <input
                  type="url"
                  id="url"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 bg-white ${
                    errors.url ? 'border-red-300' : ''
                  }`}
                />
                {errors.url && (
                  <p className="mt-1 text-sm text-red-600">{errors.url}</p>
                )}
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Secret Key</h2>
            <div className="flex items-center space-x-3">
              <code className="flex-1 px-3 py-2 bg-gray-100 rounded-md font-mono text-sm">
                {webhook.secretKey}
              </code>
              <button
                onClick={copySecretKey}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Copy
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Use this secret key to verify webhook authenticity in your endpoint.
            </p>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Event Selection</h2>
            {errors.events && (
              <p className="mb-4 text-sm text-red-600">{errors.events}</p>
            )}
            
            <div className="space-y-3">
              {AVAILABLE_EVENTS.map((event) => (
                <label key={event.id} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.events.includes(event.id)}
                    onChange={() => handleEventToggle(event.id)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{event.label}</div>
                    <div className="text-sm text-gray-500">{event.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Statistics</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-2xl font-semibold text-gray-900">{webhook.totalCalls}</div>
                <div className="text-sm text-gray-500">Total Calls</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-green-600">{webhook.successfulCalls}</div>
                <div className="text-sm text-gray-500">Successful</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-red-600">{webhook.failedCalls}</div>
                <div className="text-sm text-gray-500">Failed</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {calls.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-gray-400 text-4xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No webhook calls yet</h3>
              <p className="text-gray-600">
                Once events start triggering, you'll see the call history here.
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Response
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {calls.map((call) => (
                  <tr key={call.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{call.event}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        call.status === 'SUCCESS'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {call.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {call.responseCode && (
                          <span className="font-mono">{call.responseCode}</span>
                        )}
                        {call.responseTime && (
                          <span className="text-gray-500 ml-2">({call.responseTime}ms)</span>
                        )}
                      </div>
                      {call.error && (
                        <div className="text-xs text-red-600 mt-1">{call.error}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTimestamp(call.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}