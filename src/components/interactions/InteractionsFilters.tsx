'use client'

import { useState, useEffect } from 'react'

interface InteractionsFiltersProps {
  filters: {
    contactId: string
    campaignId: string
    sequenceId: string
    interactionType: string
    dateFrom: string
    dateTo: string
    search: string
  }
  onChange: (filters: any) => void
}

export default function InteractionsFilters({ filters, onChange }: InteractionsFiltersProps) {
  const [contacts, setContacts] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [sequences, setSequences] = useState<any[]>([])
  const [localFilters, setLocalFilters] = useState(filters)

  useEffect(() => {
    fetchFilterOptions()
  }, [])

  const fetchFilterOptions = async () => {
    try {
      // Fetch contacts
      const contactsRes = await fetch('/api/contacts?limit=100')
      if (contactsRes.ok) {
        const data = await contactsRes.json()
        setContacts(data.contacts || [])
      }

      // Fetch campaigns
      const campaignsRes = await fetch('/api/campaigns')
      if (campaignsRes.ok) {
        const data = await campaignsRes.json()
        setCampaigns(data.campaigns || [])
      }

      // Fetch sequences
      const sequencesRes = await fetch('/api/sequences')
      if (sequencesRes.ok) {
        const data = await sequencesRes.json()
        setSequences(data.sequences || [])
      }
    } catch (error) {
      console.error('Error fetching filter options:', error)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
  }

  const handleApplyFilters = () => {
    onChange(localFilters)
  }

  const handleResetFilters = () => {
    const resetFilters = {
      contactId: '',
      campaignId: '',
      sequenceId: '',
      interactionType: 'all',
      dateFrom: '',
      dateTo: '',
      search: ''
    }
    setLocalFilters(resetFilters)
    onChange(resetFilters)
  }

  const interactionTypes = [
    { value: 'all', label: 'All Interactions' },
    { value: 'sent', label: 'Sent' },
    { value: 'opened', label: 'Opened' },
    { value: 'clicked', label: 'Clicked' },
    { value: 'replied', label: 'Replied' },
    { value: 'bounced', label: 'Bounced' },
    { value: 'blocked', label: 'Blocked' }
  ]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filters</h2>
        <div className="flex gap-2">
          <button
            onClick={handleResetFilters}
            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Reset
          </button>
          <button
            onClick={handleApplyFilters}
            className="px-4 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Apply Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Search
          </label>
          <input
            type="text"
            value={localFilters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder="Search by subject or content..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Contact */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Contact
          </label>
          <select
            value={localFilters.contactId}
            onChange={(e) => handleFilterChange('contactId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Contacts</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.firstName && contact.lastName
                  ? `${contact.firstName} ${contact.lastName}`
                  : contact.email}
              </option>
            ))}
          </select>
        </div>

        {/* Campaign */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Campaign
          </label>
          <select
            value={localFilters.campaignId}
            onChange={(e) => handleFilterChange('campaignId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Campaigns</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sequence */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Sequence
          </label>
          <select
            value={localFilters.sequenceId}
            onChange={(e) => handleFilterChange('sequenceId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Sequences</option>
            {sequences.map((sequence) => (
              <option key={sequence.id} value={sequence.id}>
                {sequence.name}
              </option>
            ))}
          </select>
        </div>

        {/* Interaction Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Interaction Type
          </label>
          <select
            value={localFilters.interactionType}
            onChange={(e) => handleFilterChange('interactionType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            {interactionTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Date From
          </label>
          <input
            type="date"
            value={localFilters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Date To
          </label>
          <input
            type="date"
            value={localFilters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>
    </div>
  )
}