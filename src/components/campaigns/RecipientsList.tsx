'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'

interface Recipient {
  id: string
  status: string
  sentAt: Date | null
  openedAt: Date | null
  clickedAt: Date | null
  repliedAt: Date | null
  bouncedAt: Date | null
  contact: {
    email: string
    firstName: string | null
    lastName: string | null
    company: string | null
  }
}

interface RecipientsListProps {
  recipients: Recipient[]
  trackingEnabled: boolean
}

export default function RecipientsList({ recipients, trackingEnabled }: RecipientsListProps) {
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Filter recipients
  const filteredRecipients = recipients.filter(recipient => {
    // Apply status filter
    if (filter !== 'all') {
      if (filter === 'engaged' && !recipient.openedAt && !recipient.clickedAt && !recipient.repliedAt) {
        return false
      }
      if (filter === 'opened' && !recipient.openedAt) return false
      if (filter === 'clicked' && !recipient.clickedAt) return false
      if (filter === 'replied' && !recipient.repliedAt) return false
      if (filter === 'bounced' && recipient.status !== 'BOUNCED') return false
      if (filter === 'failed' && recipient.status !== 'FAILED') return false
    }

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      const fullName = `${recipient.contact.firstName || ''} ${recipient.contact.lastName || ''}`.toLowerCase()
      return (
        recipient.contact.email.toLowerCase().includes(searchLower) ||
        fullName.includes(searchLower) ||
        recipient.contact.company?.toLowerCase().includes(searchLower)
      )
    }

    return true
  })

  // Pagination
  const totalPages = Math.ceil(filteredRecipients.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedRecipients = filteredRecipients.slice(startIndex, startIndex + itemsPerPage)

  const getStatusColor = (recipient: Recipient) => {
    if (recipient.status === 'BOUNCED') return 'text-red-600'
    if (recipient.status === 'FAILED') return 'text-red-600'
    if (recipient.repliedAt) return 'text-green-600'
    if (recipient.clickedAt) return 'text-blue-600'
    if (recipient.openedAt) return 'text-purple-600'
    if (recipient.sentAt) return 'text-gray-600'
    return 'text-gray-400'
  }

  const getStatusText = (recipient: Recipient) => {
    if (recipient.status === 'BOUNCED') return 'Bounced'
    if (recipient.status === 'FAILED') return 'Failed'
    if (recipient.repliedAt) return `Replied ${formatDistanceToNow(new Date(recipient.repliedAt), { addSuffix: true })}`
    if (recipient.clickedAt) return `Clicked ${formatDistanceToNow(new Date(recipient.clickedAt), { addSuffix: true })}`
    if (recipient.openedAt) return `Opened ${formatDistanceToNow(new Date(recipient.openedAt), { addSuffix: true })}`
    if (recipient.sentAt) return `Sent ${formatDistanceToNow(new Date(recipient.sentAt), { addSuffix: true })}`
    return 'Pending'
  }

  return (
    <div className="mt-8 bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recipients</h2>
        
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by email, name, or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Recipients ({recipients.length})</option>
            <option value="engaged">Engaged</option>
            {trackingEnabled && (
              <>
                <option value="opened">Opened</option>
                <option value="clicked">Clicked</option>
              </>
            )}
            <option value="replied">Replied</option>
            <option value="bounced">Bounced</option>
            <option value="failed">Failed</option>
          </select>

          {/* Export */}
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
            Export CSV
          </button>
        </div>
      </div>

      {/* Recipients Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              {trackingEnabled && (
                <>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Opens
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clicks
                  </th>
                </>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Replied
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedRecipients.map((recipient) => (
              <tr key={recipient.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {recipient.contact.email}
                    </div>
                    {(recipient.contact.firstName || recipient.contact.lastName) && (
                      <div className="text-sm text-gray-500">
                        {recipient.contact.firstName} {recipient.contact.lastName}
                        {recipient.contact.company && ` • ${recipient.contact.company}`}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-sm ${getStatusColor(recipient)}`}>
                    {getStatusText(recipient)}
                  </span>
                </td>
                {trackingEnabled && (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {recipient.openedAt ? (
                        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {recipient.clickedAt ? (
                        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {recipient.repliedAt ? (
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button className="text-blue-600 hover:text-blue-700">
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(startIndex + itemsPerPage, filteredRecipients.length)}
                </span>{' '}
                of <span className="font-medium">{filteredRecipients.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      currentPage === i + 1
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}