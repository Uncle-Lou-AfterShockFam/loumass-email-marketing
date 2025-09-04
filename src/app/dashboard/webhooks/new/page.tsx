'use client'

import { useState } from 'react'
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

export default function NewWebhookPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    url: '',
    events: [] as string[],
    status: 'ACTIVE'
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create webhook')
      }

      const result = await response.json()
      toast.success('Webhook created successfully')
      router.push(`/dashboard/webhooks/${result.webhook.id}`)
    } catch (error: any) {
      console.error('Error creating webhook:', error)
      toast.error(error.message || 'Failed to create webhook')
    } finally {
      setLoading(false)
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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Webhook</h1>
        <p className="mt-2 text-gray-600">
          Set up a webhook endpoint to receive real-time notifications
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
                placeholder="My Webhook"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description (optional)
              </label>
              <textarea
                id="description"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 bg-white"
                placeholder="Webhook for tracking email events..."
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
                placeholder="https://your-app.com/webhooks/loumass"
              />
              {errors.url && (
                <p className="mt-1 text-sm text-red-600">{errors.url}</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Event Selection</h2>
          <p className="text-sm text-gray-600 mb-4">
            Choose which events should trigger this webhook
          </p>
          
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
          <h2 className="text-lg font-medium text-gray-900 mb-4">Configuration</h2>
          
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

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Webhook'}
          </button>
        </div>
      </form>
    </div>
  )
}