'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'

interface Contact {
  id: string
  email: string
  firstName?: string
  lastName?: string
  company?: string
  tags: string[]
  unsubscribed: boolean
  bounced: boolean
}

interface ContactSelectorProps {
  selectedContactIds: string[]
  onChange: (contactIds: string[]) => void
  error?: string
}

export default function ContactSelector({ selectedContactIds, onChange, error }: ContactSelectorProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isSelectAll, setIsSelectAll] = useState(false)

  const itemsPerPage = 10

  // Load contacts
  useEffect(() => {
    loadContacts()
  }, [currentPage, searchTerm, filterTag])

  const loadContacts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(filterTag && { tag: filterTag }),
        includeUnsubscribed: 'false', // Don't include unsubscribed contacts
        includeBounced: 'false' // Don't include bounced contacts
      })

      const response = await fetch(`/api/contacts?${params}`)
      if (!response.ok) throw new Error('Failed to load contacts')

      const data = await response.json()
      setContacts(data.contacts)
      setTotalCount(data.total)

      // Extract unique tags
      const tags = new Set<string>()
      data.contacts.forEach((contact: Contact) => {
        contact.tags.forEach(tag => tags.add(tag))
      })
      setAvailableTags(Array.from(tags).sort())

    } catch (error) {
      console.error('Error loading contacts:', error)
      toast.error('Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }

  const handleContactToggle = (contactId: string) => {
    const newSelectedIds = selectedContactIds.includes(contactId)
      ? selectedContactIds.filter(id => id !== contactId)
      : [...selectedContactIds, contactId]
    onChange(newSelectedIds)
  }

  const handleSelectAll = () => {
    if (isSelectAll) {
      // Deselect all visible contacts
      const newSelectedIds = selectedContactIds.filter(
        id => !contacts.map(c => c.id).includes(id)
      )
      onChange(newSelectedIds)
    } else {
      // Select all visible contacts
      const visibleContactIds = contacts.map(c => c.id)
      const newSelectedIds = [...new Set([...selectedContactIds, ...visibleContactIds])]
      onChange(newSelectedIds)
    }
    setIsSelectAll(!isSelectAll)
  }

  const handleBulkImport = () => {
    // TODO: Implement CSV import modal
    toast('CSV import feature coming soon!', { icon: 'ℹ️' })
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage)
  const selectedCount = selectedContactIds.length

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Select Recipients</h2>
        <button
          type="button"
          onClick={handleBulkImport}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Import from CSV
        </button>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
        <div>
          <select
            value={filterTag}
            onChange={(e) => {
              setFilterTag(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">All tags</option>
            {availableTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {selectedCount} selected
          </span>
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {isSelectAll ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      </div>

      {/* Contacts List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No contacts found.</p>
          <button
            type="button"
            onClick={handleBulkImport}
            className="mt-2 text-blue-600 hover:text-blue-700"
          >
            Import contacts from CSV
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className={`flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                selectedContactIds.includes(contact.id) ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => handleContactToggle(contact.id)}
            >
              <input
                type="checkbox"
                checked={selectedContactIds.includes(contact.id)}
                onChange={() => handleContactToggle(contact.id)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
              />
              
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {contact.firstName && contact.lastName
                        ? `${contact.firstName} ${contact.lastName}`
                        : contact.email
                      }
                    </p>
                    <p className="text-sm text-gray-500">{contact.email}</p>
                    {contact.company && (
                      <p className="text-sm text-gray-500">{contact.company}</p>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {contact.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <div className="text-sm text-gray-700">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} contacts
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 text-sm rounded ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                )
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Selection Summary */}
      {selectedCount > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            {selectedCount} contacts selected for this campaign
          </p>
        </div>
      )}

      {error && (
        <p className="text-red-600 text-sm mt-2">{error}</p>
      )}
    </div>
  )
}