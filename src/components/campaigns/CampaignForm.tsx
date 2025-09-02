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

interface Sequence {
  id: string
  name: string
  description?: string | null
  steps: any[]
  startsWithCondition?: boolean
}

interface CampaignFormProps {
  contacts: Contact[]
  templates: Template[]
  trackingDomain: TrackingDomainOrNull
  sequences?: Sequence[]
  campaign?: any // For edit mode
}

export default function CampaignForm({ 
  contacts, 
  templates, 
  trackingDomain,
  sequences,
  campaign 
}: CampaignFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sendingStatus, setSendingStatus] = useState<string | null>(null)
  
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
  const [attachments, setAttachments] = useState<File[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const validFiles: File[] = []
    const maxSize = 10 * 1024 * 1024 // 10MB per file
    const totalMaxSize = 25 * 1024 * 1024 // 25MB total

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.size > maxSize) {
        alert(`File "${file.name}" is too large. Maximum size is 10MB per file.`)
        continue
      }
      validFiles.push(file)
    }

    const currentSize = attachments.reduce((acc, file) => acc + file.size, 0)
    const newSize = validFiles.reduce((acc, file) => acc + file.size, 0)
    
    if (currentSize + newSize > totalMaxSize) {
      alert('Total attachment size cannot exceed 25MB')
      return
    }

    setAttachments(prev => [...prev, ...validFiles])
    // Reset the input
    e.target.value = ''
  }

  const handleFileRemove = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
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
      // Convert attachments to base64 for sending
      const attachmentData: Array<{
        filename: string
        content: string
        contentType: string
      }> = []

      if (attachments.length > 0) {
        setUploadingFiles(true)
        for (const file of attachments) {
          const reader = new FileReader()
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const result = reader.result as string
              // Remove the data:type/subtype;base64, prefix
              const base64Content = result.split(',')[1]
              resolve(base64Content)
            }
            reader.onerror = reject
            reader.readAsDataURL(file)
          })

          attachmentData.push({
            filename: file.name,
            content: base64,
            contentType: file.type || 'application/octet-stream'
          })
        }
        setUploadingFiles(false)
      }

      const campaignData = {
        name,
        subject,
        content,
        attachments: attachmentData,
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

      // Check content size before sending (Vercel limit is 4.5MB)
      const bodyString = JSON.stringify(campaignData)
      const bodySizeInBytes = new Blob([bodyString]).size
      const bodySizeInMB = bodySizeInBytes / (1024 * 1024)
      
      if (bodySizeInMB > 4) {
        alert(`Campaign content is too large (${bodySizeInMB.toFixed(2)}MB). Please reduce image sizes or remove some images. Maximum size is 4MB.`)
        setIsSubmitting(false)
        setSendingStatus(null)
        return
      }

      const response = await fetch(campaign ? `/api/campaigns/${campaign.id}` : '/api/campaigns', {
        method: campaign ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyString
      })

      if (response.ok) {
        const data = await response.json()
        
        if (action === 'send') {
          // Trigger immediate send
          // For POST (create), the campaign is in data.campaign
          // For PUT (update), the campaign is in data directly
          const campaignId = campaign ? data.id : data.campaign.id
          console.log('Attempting to send campaign:', campaignId)
          
          setSendingStatus('Sending campaign...')
          
          const sendResponse = await fetch(`/api/campaigns/${campaignId}/send`, {
            method: 'POST'
          })
          
          if (!sendResponse.ok) {
            const errorData = await sendResponse.json()
            console.error('Campaign send failed:', errorData)
            setSendingStatus(null)
            alert(errorData.error || 'Failed to send campaign. Please check your Gmail connection.')
            // Still redirect to campaign details page so user can see the campaign and retry
            router.push(`/dashboard/campaigns/${campaignId}`)
            return
          }
          
          // Send successful
          const sendData = await sendResponse.json()
          console.log('Campaign send response:', sendData)
          setSendingStatus('Campaign sent successfully!')
          
          // Brief delay to show success message
          await new Promise(resolve => setTimeout(resolve, 1500))
        }
        
        // Always redirect to campaigns list after successful creation
        router.push('/dashboard/campaigns')
      } else {
        alert('Failed to save campaign')
      }
    } catch (error) {
      console.error('Error in campaign form:', error)
      alert(`Error saving campaign: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      {templates.length > 0 && !campaign && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Start from Template</h2>
          <select
            value={selectedTemplate}
            onChange={(e) => handleTemplateSelect(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Campaign Details</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
              Campaign Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Summer Newsletter 2024"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
              Email Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., {{firstName}}, check out our summer deals!"
              required
            />
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Use variables: {'{{firstName}}'}, {'{{lastName}}'}, {'{{company}}'}, {'{{email}}'}
            </p>
          </div>
        </div>
      </div>

      {/* Email Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Email Content</h2>
        <RichTextEditor
          value={content}
          onChange={setContent}
          placeholder="Write your email content here..."
        />
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Tip: Use variables to personalize your emails. Available variables will be replaced with contact data.
        </p>
      </div>

      {/* File Attachments */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">File Attachments</h2>
        
        <div className="space-y-4">
          {/* File Upload Area */}
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            <input
              type="file"
              id="file-upload"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt,.csv"
              disabled={uploadingFiles}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer"
            >
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-blue-600 hover:text-blue-500">
                  Click to upload
                </span>{' '}
                or drag and drop
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                PDF, DOC, XLS, PNG, JPG up to 10MB each
              </p>
            </label>
          </div>

          {/* Attached Files List */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Attached Files ({attachments.length})
              </p>
              <div className="space-y-2">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <svg
                        className="h-8 w-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFileRemove(index)}
                      className="text-red-500 hover:text-red-700 transition"
                      disabled={uploadingFiles}
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                Total size: {(attachments.reduce((acc, file) => acc + file.size, 0) / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recipients */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recipients</h2>
        
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
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
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex flex-wrap gap-2">
              {selectedContacts.slice(0, 10).map(contactId => {
                const contact = contacts.find(c => c.id === contactId)
                return contact ? (
                  <span key={contactId} className="px-3 py-1 bg-gray-100 text-gray-800 dark:text-gray-200 rounded-full text-sm">
                    {contact.email}
                  </span>
                ) : null
              })}
              {selectedContacts.length > 10 && (
                <span className="px-3 py-1 bg-gray-200 text-gray-800 dark:text-gray-200 rounded-full text-sm">
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Tracking Settings</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Enable Tracking</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Track email opens and link clicks</p>
            </div>
            <button
              type="button"
              onClick={() => setTrackingEnabled(!trackingEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                trackingEnabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-200 transition-transform ${
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
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-800 dark:text-gray-200">Track email opens</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={clickTracking}
                    onChange={(e) => setClickTracking(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-800 dark:text-gray-200">Track link clicks</span>
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Send Options</h2>
        
        <div className="space-y-4">
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="now"
                checked={scheduleType === 'now'}
                onChange={(e) => setScheduleType('now')}
                className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 focus:ring-blue-500"
              />
              <span className="ml-2">Send immediately</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="radio"
                value="later"
                checked={scheduleType === 'later'}
                onChange={(e) => setScheduleType('later')}
                className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 focus:ring-blue-500"
              />
              <span className="ml-2">Schedule for later</span>
            </label>
          </div>

          {scheduleType === 'later' && (
            <div>
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                Schedule Date & Time
              </label>
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Test Email */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Send Test Email</h2>
        
        <div className="flex gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="test@example.com"
          />
          <button
            type="button"
            onClick={handleSendTest}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 transition"
          >
            Send Test
          </button>
        </div>
      </div>

      {/* Status Message */}
      {sendingStatus && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-lg">
          {sendingStatus}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => router.push('/dashboard/campaigns')}
          className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 transition"
        >
          Cancel
        </button>
        
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleSubmit('draft')}
            disabled={isSubmitting || !name || !subject || !content}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 transition disabled:opacity-50"
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
              {isSubmitting ? 'Processing...' : 'Send Campaign'}
            </button>
          )}
        </div>
      </div>

      {/* Contact Selection Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Select Recipients</h3>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-400"
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                            : 'bg-gray-100 text-gray-800 dark:text-gray-200 hover:bg-gray-200'
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
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 font-medium">Select All ({filteredContacts.length})</span>
                </label>

                {filteredContacts.map(contact => (
                  <label key={contact.id} className="flex items-center p-2 hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 rounded">
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
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{contact.email}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {[contact.firstName, contact.lastName].filter(Boolean).join(' ')}
                        {contact.company && ` • ${contact.company}`}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedContacts.length} contacts selected
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 transition"
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