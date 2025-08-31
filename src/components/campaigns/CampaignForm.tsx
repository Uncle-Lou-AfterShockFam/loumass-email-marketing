'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import SequenceSelector from './SequenceSelector'

// Dynamic import for rich text editor (to avoid SSR issues)
const RichTextEditor = dynamic(() => import('@/components/editor/RichTextEditor'), { 
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />
})

interface Contact {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  company: string | null
  tags: string[]
}

interface Template {
  id: string
  name: string
  subject: string
  content: string
  category: string | null
}

interface TrackingDomain {
  id: string
  domain: string
  verified: boolean
}

type TrackingDomainOrNull = TrackingDomain | null

interface CampaignFormProps {
  contacts: Contact[]
  templates: Template[]
  trackingDomain: TrackingDomainOrNull
  campaign?: any // For edit mode
}

export default function CampaignForm({ 
  contacts, 
  templates, 
  trackingDomain,
  campaign 
}: CampaignFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form state
  const [name, setName] = useState(campaign?.name || '')
  const [subject, setSubject] = useState(campaign?.subject || '')
  const [content, setContent] = useState(campaign?.content || '')
  const [selectedContacts, setSelectedContacts] = useState<string[]>(campaign?.recipients?.map((r: any) => r.contactId) || [])
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [trackingEnabled, setTrackingEnabled] = useState(campaign?.trackingEnabled ?? true)
  const [openTracking, setOpenTracking] = useState(true)
  const [clickTracking, setClickTracking] = useState(true)
  const [scheduleType, setScheduleType] = useState<'now' | 'later'>('now')
  const [scheduledFor, setScheduledFor] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(null)

  // Contact selection
  const [showContactModal, setShowContactModal] = useState(false)
  const [contactSearch, setContactSearch] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const allTags = Array.from(new Set(contacts.flatMap(c => c.tags)))

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contactSearch === '' || 
      contact.email.toLowerCase().includes(contactSearch.toLowerCase()) ||
      contact.firstName?.toLowerCase().includes(contactSearch.toLowerCase()) ||
      contact.lastName?.toLowerCase().includes(contactSearch.toLowerCase()) ||
      contact.company?.toLowerCase().includes(contactSearch.toLowerCase())
    
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.some(tag => contact.tags.includes(tag))
    
    return matchesSearch && matchesTags
  })

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setSubject(template.subject)
      setContent(template.content)
      setSelectedTemplate(templateId)
    }
  }

  const handleSendTest = async () => {
    if (!testEmail) {
      alert('Please enter a test email address')
      return
    }

    try {
      const response = await fetch('/api/campaigns/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail,
          subject,
          content,
          trackingEnabled: false // No tracking for test emails
        })
      })

      if (response.ok) {
        alert('Test email sent successfully!')
        setTestEmail('')
      } else {
        alert('Failed to send test email')
      }
    } catch (error) {
      alert('Error sending test email')
    }
  }

  const handleSubmit = async (action: 'draft' | 'schedule' | 'send') => {
    setIsSubmitting(true)
    
    try {
      const campaignData = {
        name,
        subject,
        content,
        status: action === 'draft' ? 'DRAFT' : action === 'schedule' ? 'SCHEDULED' : 'DRAFT',
        trackingEnabled,
        trackingOptions: {
          opens: openTracking,
          clicks: clickTracking
        },
        recipients: selectedContacts,
        scheduledFor: action === 'schedule' ? scheduledFor : null,
        trackingDomainId: trackingDomain?.id,
        sequenceId: selectedSequenceId
      }

      const response = await fetch(campaign ? `/api/campaigns/${campaign.id}` : '/api/campaigns', {
        method: campaign ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData)
      })

      if (response.ok) {
        const data = await response.json()
        
        if (action === 'send') {
          // Trigger immediate send
          const campaignId = data.campaign?.id || data.id
          const sendResponse = await fetch(`/api/campaigns/${campaignId}/send`, {
            method: 'POST'
          })
          
          if (!sendResponse.ok) {
            const errorData = await sendResponse.json()
            alert(errorData.error || 'Failed to send campaign. Please check your Gmail connection.')
            router.push(`/dashboard/campaigns/${campaignId}`)
            return
          }
        }
        
        router.push('/dashboard/campaigns')
      } else {
        alert('Failed to save campaign')
      }
    } catch (error) {
      alert('Error saving campaign')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      {templates.length > 0 && !campaign && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Start from Template</h2>
          <select
            value={selectedTemplate}
            onChange={(e) => handleTemplateSelect(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a template (optional)</option>
            {templates.map(template => (
              <option key={template.id} value={template.id}>
                {template.name} {template.category && `(${template.category})`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Campaign Details */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Campaign Details</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Summer Newsletter 2024"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., {{firstName}}, check out our summer deals!"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Use variables: {'{{firstName}}'}, {'{{lastName}}'}, {'{{company}}'}, {'{{email}}'}
            </p>
          </div>
        </div>
      </div>

      {/* Email Content */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Content</h2>
        <RichTextEditor
          value={content}
          onChange={setContent}
          placeholder="Write your email content here..."
        />
        <p className="mt-2 text-sm text-gray-500">
          Tip: Use variables to personalize your emails. Available variables will be replaced with contact data.
        </p>
      </div>

      {/* Recipients */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recipients</h2>
        
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-600">
              {selectedContacts.length} contacts selected
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowContactModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Select Contacts
          </button>
        </div>

        {selectedContacts.length > 0 && (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex flex-wrap gap-2">
              {selectedContacts.slice(0, 10).map(contactId => {
                const contact = contacts.find(c => c.id === contactId)
                return contact ? (
                  <span key={contactId} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    {contact.email}
                  </span>
                ) : null
              })}
              {selectedContacts.length > 10 && (
                <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm">
                  +{selectedContacts.length - 10} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sequence Integration */}
      <SequenceSelector
        selectedSequenceId={selectedSequenceId || undefined}
        onSelect={setSelectedSequenceId}
        disabled={isSubmitting}
      />

      {/* Tracking Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tracking Settings</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Enable Tracking</p>
              <p className="text-sm text-gray-500">Track email opens and link clicks</p>
            </div>
            <button
              type="button"
              onClick={() => setTrackingEnabled(!trackingEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                trackingEnabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  trackingEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {trackingEnabled && (
            <>
              <div className="pl-4 space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={openTracking}
                    onChange={(e) => setOpenTracking(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Track email opens</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={clickTracking}
                    onChange={(e) => setClickTracking(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Track link clicks</span>
                </label>
              </div>

              {trackingDomain && !trackingDomain.verified && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Your tracking domain is not verified. Tracking will use default domain.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Schedule Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Send Options</h2>
        
        <div className="space-y-4">
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="now"
                checked={scheduleType === 'now'}
                onChange={(e) => setScheduleType('now')}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="ml-2">Send immediately</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="radio"
                value="later"
                checked={scheduleType === 'later'}
                onChange={(e) => setScheduleType('later')}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="ml-2">Schedule for later</span>
            </label>
          </div>

          {scheduleType === 'later' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Schedule Date & Time
              </label>
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Test Email */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Send Test Email</h2>
        
        <div className="flex gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="test@example.com"
          />
          <button
            type="button"
            onClick={handleSendTest}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            Send Test
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => router.push('/dashboard/campaigns')}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleSubmit('draft')}
            disabled={isSubmitting || !name || !subject || !content}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            Save as Draft
          </button>
          
          {scheduleType === 'later' ? (
            <button
              type="button"
              onClick={() => handleSubmit('schedule')}
              disabled={isSubmitting || !name || !subject || !content || selectedContacts.length === 0 || !scheduledFor}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              Schedule Campaign
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSubmit('send')}
              disabled={isSubmitting || !name || !subject || !content || selectedContacts.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              Send Campaign
            </button>
          )}
        </div>
      </div>

      {/* Contact Selection Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Select Recipients</h3>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search contacts..."
                />

                {allTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {allTags.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSelectedTags(prev =>
                          prev.includes(tag) 
                            ? prev.filter(t => t !== tag)
                            : [...prev, tag]
                        )}
                        className={`px-3 py-1 rounded-full text-sm transition ${
                          selectedTags.includes(tag)
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto">
              <div className="space-y-2">
                <label className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedContacts(filteredContacts.map(c => c.id))
                      } else {
                        setSelectedContacts([])
                      }
                    }}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 font-medium">Select All ({filteredContacts.length})</span>
                </label>

                {filteredContacts.map(contact => (
                  <label key={contact.id} className="flex items-center p-2 hover:bg-gray-50 rounded">
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(contact.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedContacts([...selectedContacts, contact.id])
                        } else {
                          setSelectedContacts(selectedContacts.filter(id => id !== contact.id))
                        }
                      }}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{contact.email}</p>
                      <p className="text-sm text-gray-500">
                        {[contact.firstName, contact.lastName].filter(Boolean).join(' ')}
                        {contact.company && ` • ${contact.company}`}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-between">
              <p className="text-sm text-gray-600">
                {selectedContacts.length} contacts selected
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}