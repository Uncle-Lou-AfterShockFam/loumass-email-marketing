'use client'

import { useState } from 'react'
import ImportContactsModal from './ImportContactsModal'
import AddContactModal from './AddContactModal'

interface Tag {
  id: string
  name: string
  count: number
}

interface ContactsHeaderProps {
  totalContacts: number
  tags: Tag[]
  onContactAdded: (newContact: any) => void
}

export default function ContactsHeader({ totalContacts, tags, onContactAdded }: ContactsHeaderProps) {
  const [showImportModal, setShowImportModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  const handleExport = async (format: 'csv' | 'xlsx') => {
    // TODO: Implement actual export functionality
    console.log(`Exporting contacts as ${format.toUpperCase()}`)
    
    // Mock export process
    const exportData = {
      format,
      timestamp: new Date().toISOString(),
      totalContacts
    }
    
    // Create and download file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `contacts-export-${Date.now()}.${format}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              All Contacts ({totalContacts.toLocaleString()})
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage your email contacts and subscriber lists
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Export Dropdown */}
            <div className="relative">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleExport(e.target.value as 'csv' | 'xlsx')
                    e.target.value = '' // Reset selection
                  }
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-200 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Export</option>
                <option value="csv">Export as CSV</option>
                <option value="xlsx">Export as Excel</option>
              </select>
            </div>

            {/* Import Button */}
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              Import
            </button>

            {/* Add Contact Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Add Contact
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex flex-wrap items-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">Subscribed: <span className="font-medium">{totalContacts}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span className="text-gray-600">Total Tags: <span className="font-medium">{tags.length}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600">Last import: <span className="font-medium">2 days ago</span></span>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <ImportContactsModal
          onClose={() => setShowImportModal(false)}
          onImport={(data) => {
            console.log('Import data:', data)
            setShowImportModal(false)
          }}
        />
      )}

      {/* Add Contact Modal */}
      {showAddModal && (
        <AddContactModal
          onClose={() => setShowAddModal(false)}
          onSave={(contact) => {
            console.log('New contact:', contact)
            setShowAddModal(false)
            onContactAdded(contact)
          }}
          availableTags={tags.map(tag => tag.name)}
        />
      )}
    </>
  )
}