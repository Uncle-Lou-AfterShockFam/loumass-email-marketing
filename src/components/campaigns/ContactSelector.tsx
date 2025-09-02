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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Select Recipients</h2>
        <button
          type="button"
          onClick={handleBulkImport}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
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
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <select
            value={filterTag}
            onChange={(e) => {
              setFilterTag(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All tags</option>
            {availableTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {selectedCount} selected
          </span>
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
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
          <p className="text-gray-600 dark:text-gray-400">No contacts found.</p>
          <button
            type="button"
            onClick={handleBulkImport}
            className="mt-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            Import contacts from CSV
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className={`flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                selectedContactIds.includes(contact.id) ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
              onClick={() => handleContactToggle(contact.id)}
            >
              <input
                type="checkbox"
                checked={selectedContactIds.includes(contact.id)}
                onChange={() => handleContactToggle(contact.id)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded mr-3"
              />
              
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {contact.firstName && contact.lastName
                        ? `${contact.firstName} ${contact.lastName}`
                        : contact.email
                      }
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{contact.email}</p>
                    {contact.company && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{contact.company}</p>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {contact.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded"
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
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-800 dark:text-gray-200">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} contacts
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
                        : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
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
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Selection Summary */}
      {selectedCount > 0 && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
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