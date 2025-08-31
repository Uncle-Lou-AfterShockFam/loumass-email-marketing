'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Contact {
  id: string
  email: string
  displayName: string
  firstName: string | null
  lastName: string | null
  tags: string[]
  createdAt: string
}

interface Sequence {
  id: string
  name: string
  status: string
}

interface Campaign {
  id: string
  name: string
  status: string
  recipientCount: number
}

interface EnrollData {
  sequence: Sequence
  contacts: {
    available: Contact[]
    enrolled: any[]
  }
  campaigns: Campaign[]
  summary: {
    totalContacts: number
    availableForEnrollment: number
    alreadyEnrolled: number
    canEnroll: boolean
  }
}

export default function EnrollPage() {
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState<EnrollData | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [startImmediately, setStartImmediately] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [enrollmentMode, setEnrollmentMode] = useState<'individual' | 'campaign'>('individual')
  const [selectedCampaign, setSelectedCampaign] = useState<string>('')
  const [campaignContacts, setCampaignContacts] = useState<Contact[]>([])
  const [loadingCampaignContacts, setLoadingCampaignContacts] = useState(false)

  useEffect(() => {
    fetchEnrollData()
  }, [])

  const fetchEnrollData = async () => {
    try {
      const response = await fetch(`/api/sequences/${params.id}/enroll`)
      if (!response.ok) {
        throw new Error('Failed to fetch enrollment data')
      }
      const enrollData = await response.json()
      setData(enrollData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = async () => {
    if (selectedContacts.length === 0) {
      setError('Please select at least one contact to enroll')
      return
    }

    setEnrolling(true)
    setError(null)

    try {
      const response = await fetch(`/api/sequences/${params.id}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactIds: selectedContacts,
          startImmediately,
          customVariables: {}
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to enroll contacts')
      }

      const result = await response.json()
      
      // Show success and redirect
      router.push(`/dashboard/sequences/${params.id}?enrolled=${result.enrollments.length}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enroll contacts')
    } finally {
      setEnrolling(false)
    }
  }

  const toggleContact = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    )
  }

  const toggleAll = () => {
    if (!data) return
    
    const contactsToUse = enrollmentMode === 'campaign' ? campaignContacts : data.contacts.available
    
    if (selectedContacts.length === contactsToUse.length) {
      setSelectedContacts([])
    } else {
      setSelectedContacts(contactsToUse.map(c => c.id))
    }
  }

  const handleCampaignSelect = async (campaignId: string) => {
    if (!campaignId) {
      setCampaignContacts([])
      setSelectedContacts([])
      return
    }

    setSelectedCampaign(campaignId)
    setLoadingCampaignContacts(true)
    setError(null)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/contacts`)
      if (!response.ok) {
        throw new Error('Failed to fetch campaign contacts')
      }
      
      const campaignData = await response.json()
      const contacts = campaignData.recipients.map((r: any) => r.contact)
      
      setCampaignContacts(contacts)
      setSelectedContacts([]) // Reset selection
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaign contacts')
      setCampaignContacts([])
    } finally {
      setLoadingCampaignContacts(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center">
        <p className="text-red-600">{error || 'Failed to load enrollment data'}</p>
        <Link 
          href={`/dashboard/sequences/${params.id}`}
          className="mt-4 inline-block text-blue-600 hover:text-blue-700"
        >
          ← Back to Sequence
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link 
          href={`/dashboard/sequences/${params.id}`}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to {data.sequence.name}
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Enroll Contacts</h1>
        <p className="text-gray-600 mt-2">
          Select contacts to enroll in the "{data.sequence.name}" sequence
        </p>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">Total Contacts</p>
            <p className="text-2xl font-bold text-gray-900">{data.summary.totalContacts}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Available</p>
            <p className="text-2xl font-bold text-green-600">{data.summary.availableForEnrollment}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Already Enrolled</p>
            <p className="text-2xl font-bold text-blue-600">{data.summary.alreadyEnrolled}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Selected</p>
            <p className="text-2xl font-bold text-purple-600">{selectedContacts.length}</p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Enrollment Mode */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Enrollment Method</h2>
        <div className="space-y-4">
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="enrollmentMode"
                value="individual"
                checked={enrollmentMode === 'individual'}
                onChange={(e) => setEnrollmentMode(e.target.value as 'individual')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-gray-700">Select individual contacts</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="enrollmentMode"
                value="campaign"
                checked={enrollmentMode === 'campaign'}
                onChange={(e) => setEnrollmentMode(e.target.value as 'campaign')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-gray-700">Import from campaign</span>
            </label>
          </div>

          {enrollmentMode === 'campaign' && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Campaign
              </label>
              <select
                value={selectedCampaign}
                onChange={(e) => handleCampaignSelect(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Select campaign"
              >
                <option value="">Choose a campaign...</option>
                {data?.campaigns?.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name} ({campaign.recipientCount} recipients)
                  </option>
                ))}
              </select>
              {loadingCampaignContacts && (
                <div className="mt-2 flex items-center text-sm text-gray-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Loading campaign contacts...
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Enrollment Settings */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Enrollment Settings</h2>
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={startImmediately}
              onChange={(e) => setStartImmediately(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-gray-700">
              Start sequence immediately
              {!startImmediately && <span className="text-gray-500"> (5 minute delay)</span>}
            </span>
          </label>
        </div>
      </div>

      {/* Contacts Selection */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {enrollmentMode === 'campaign' ? 'Campaign Contacts' : 'Available Contacts'} 
              ({enrollmentMode === 'campaign' ? campaignContacts.length : data.contacts.available.length})
            </h2>
            {((enrollmentMode === 'campaign' && campaignContacts.length > 0) || 
              (enrollmentMode === 'individual' && data.contacts.available.length > 0)) && (
              <button
                onClick={toggleAll}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {selectedContacts.length === (enrollmentMode === 'campaign' ? campaignContacts.length : data.contacts.available.length) 
                  ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>
        </div>

        {enrollmentMode === 'campaign' && !selectedCampaign ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">Please select a campaign to view its contacts</p>
          </div>
        ) : enrollmentMode === 'campaign' && campaignContacts.length === 0 && !loadingCampaignContacts ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">No contacts found in the selected campaign</p>
          </div>
        ) : (enrollmentMode === 'individual' ? data.contacts.available.length : campaignContacts.length) === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">No contacts available for enrollment</p>
            <p className="text-sm text-gray-400 mt-1">
              All contacts are either already enrolled or there are no contacts in your account
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {(enrollmentMode === 'campaign' ? campaignContacts : data.contacts.available).map((contact) => (
              <div key={contact.id} className="p-4 hover:bg-gray-50">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedContacts.includes(contact.id)}
                    onChange={() => toggleContact(contact.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{contact.displayName}</p>
                        <p className="text-sm text-gray-500">{contact.email}</p>
                      </div>
                      {contact.tags.length > 0 && (
                        <div className="flex gap-1">
                          {contact.tags.slice(0, 3).map((tag) => (
                            <span 
                              key={tag}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                            >
                              {tag}
                            </span>
                          ))}
                          {contact.tags.length > 3 && (
                            <span className="text-xs text-gray-500">+{contact.tags.length - 3} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </label>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {((enrollmentMode === 'campaign' && campaignContacts.length > 0) || 
          (enrollmentMode === 'individual' && data.contacts.available.length > 0)) && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {selectedContacts.length} contact{selectedContacts.length !== 1 ? 's' : ''} selected
                {enrollmentMode === 'campaign' && selectedCampaign && (
                  <span className="text-gray-500"> from campaign</span>
                )}
              </p>
              <div className="flex gap-3">
                <Link
                  href={`/dashboard/sequences/${params.id}`}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </Link>
                <button
                  onClick={handleEnroll}
                  disabled={enrolling || selectedContacts.length === 0 || !data.summary.canEnroll}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center"
                >
                  {enrolling ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Enrolling...
                    </>
                  ) : (
                    `Enroll ${selectedContacts.length} Contact${selectedContacts.length !== 1 ? 's' : ''}`
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}