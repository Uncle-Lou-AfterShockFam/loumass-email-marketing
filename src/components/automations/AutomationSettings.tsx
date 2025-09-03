'use client'

import { useState } from 'react'
import { z } from 'zod'

const automationSettingsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  triggerEvent: z.enum(['NEW_SUBSCRIBER', 'SPECIFIC_DATE', 'SUBSCRIBER_SEGMENT', 'WEBHOOK', 'MANUAL']),
  triggerData: z.object({
    listId: z.string().optional(),
    segmentId: z.string().optional(),
    specificDate: z.string().optional(),
    webhookUrl: z.string().url().optional()
  }).optional(),
  applyToExisting: z.boolean(),
  trackingEnabled: z.boolean()
})

interface AutomationSettingsProps {
  initialData: any
  onComplete: (data: any) => void
}

export default function AutomationSettings({ initialData, onComplete }: AutomationSettingsProps) {
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    description: initialData.description || '',
    triggerEvent: initialData.triggerEvent || 'NEW_SUBSCRIBER',
    triggerData: initialData.triggerData || {},
    applyToExisting: initialData.applyToExisting || false,
    trackingEnabled: initialData.trackingEnabled !== false
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form
    const validation = automationSettingsSchema.safeParse(formData)
    if (!validation.success) {
      const newErrors: Record<string, string> = {}
      validation.error.issues.forEach((error) => {
        const path = error.path.join('.')
        newErrors[path] = error.message
      })
      setErrors(newErrors)
      return
    }

    setErrors({})
    onComplete(validation.data)
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleTriggerDataChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      triggerData: { ...prev.triggerData, [field]: value }
    }))
  }

  const getTriggerDescription = () => {
    switch (formData.triggerEvent) {
      case 'NEW_SUBSCRIBER':
        return 'Automation starts when someone subscribes to your list'
      case 'SPECIFIC_DATE':
        return 'Automation starts at a specific date and time'
      case 'SUBSCRIBER_SEGMENT':
        return 'Automation starts when someone joins a specific segment'
      case 'WEBHOOK':
        return 'Automation starts when a webhook is triggered'
      case 'MANUAL':
        return 'Automation starts when manually triggered'
      default:
        return ''
    }
  }

  const renderTriggerConfig = () => {
    switch (formData.triggerEvent) {
      case 'SPECIFIC_DATE':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date & Time
            </label>
            <input
              type="datetime-local"
              value={formData.triggerData.specificDate || ''}
              onChange={(e) => handleTriggerDataChange('specificDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )
      
      case 'SUBSCRIBER_SEGMENT':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Segment
            </label>
            <select
              value={formData.triggerData.segmentId || ''}
              onChange={(e) => handleTriggerDataChange('segmentId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a segment</option>
              {/* TODO: Load actual segments */}
              <option value="new-customers">New Customers</option>
              <option value="high-value">High Value</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        )
      
      case 'WEBHOOK':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Webhook URL
            </label>
            <input
              type="url"
              value={formData.triggerData.webhookUrl || ''}
              onChange={(e) => handleTriggerDataChange('webhookUrl', e.target.value)}
              placeholder="https://your-app.com/webhook"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              This URL will be called to trigger the automation
            </p>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Automation Settings</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure when and how your automation will run
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Automation Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Welcome New Subscribers"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.name && (
                <p className="text-red-600 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Optional description for your automation"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Trigger Configuration */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Initial Event</h3>
            
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trigger Event
                </label>
                <div className="space-y-3">
                  {[
                    { value: 'NEW_SUBSCRIBER', label: 'New subscriber in the list', icon: '👥' },
                    { value: 'SPECIFIC_DATE', label: 'Specific date', icon: '📅' },
                    { value: 'SUBSCRIBER_SEGMENT', label: 'New subscriber in a segment', icon: '🏷️' },
                    { value: 'WEBHOOK', label: 'Webhook trigger', icon: '🔗' },
                    { value: 'MANUAL', label: 'Manual trigger', icon: '✋' }
                  ].map((option) => (
                    <label key={option.value} className="flex items-center">
                      <input
                        type="radio"
                        name="triggerEvent"
                        value={option.value}
                        checked={formData.triggerEvent === option.value}
                        onChange={(e) => handleChange('triggerEvent', e.target.value)}
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-3 flex items-center">
                        <span className="text-lg mr-2">{option.icon}</span>
                        <span className="text-sm text-gray-900">{option.label}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {getTriggerDescription()}
                </p>
              </div>

              {/* Trigger-specific configuration */}
              {renderTriggerConfig()}
            </div>
          </div>

          {/* Advanced Options */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Advanced Options</h3>
            
            <div className="space-y-4">
              {formData.triggerEvent === 'NEW_SUBSCRIBER' && (
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      checked={formData.applyToExisting}
                      onChange={(e) => handleChange('applyToExisting', e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3">
                    <label className="text-sm font-medium text-gray-700">
                      Apply to current subscribers
                    </label>
                    <p className="text-sm text-gray-500">
                      Include subscribers who are already in your list when the automation starts
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    checked={formData.trackingEnabled}
                    onChange={(e) => handleChange('trackingEnabled', e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3">
                  <label className="text-sm font-medium text-gray-700">
                    Enable tracking
                  </label>
                  <p className="text-sm text-gray-500">
                    Track opens, clicks, and other email engagement
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-6 border-t">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Continue to Flow Builder
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}