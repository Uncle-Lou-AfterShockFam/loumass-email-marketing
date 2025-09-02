'use client'

import { formatDistanceToNow } from 'date-fns'

interface Interaction {
  id: string
  type: 'sent' | 'opened' | 'clicked' | 'replied' | 'bounced' | 'blocked'
  contactEmail: string
  contactName?: string
  campaignName?: string
  sequenceName?: string
  subject: string
  timestamp: Date
  details?: string
  clickedUrl?: string
  replyContent?: string
  bounceReason?: string
}

interface InteractionsTableProps {
  interactions: Interaction[]
  loading: boolean
}

export default function InteractionsTable({ interactions, loading }: InteractionsTableProps) {
  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'sent':
        return (
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        )
      case 'opened':
        return (
          <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
            </svg>
          </div>
        )
      case 'clicked':
        return (
          <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
          </div>
        )
      case 'replied':
        return (
          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
            <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </div>
        )
      case 'bounced':
        return (
          <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
      case 'blocked':
        return (
          <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (interactions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-8 text-center">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No interactions found</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Adjust your filters or wait for email activity to appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Subject
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Campaign/Sequence
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Time
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {interactions.map((interaction) => (
              <tr key={interaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap">
                  {getInteractionIcon(interaction.type)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {interaction.contactName || interaction.contactEmail}
                    </div>
                    {interaction.contactName && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {interaction.contactEmail}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate">
                    {interaction.subject}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {interaction.campaignName || interaction.sequenceName || '-'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {interaction.campaignName ? 'Campaign' : interaction.sequenceName ? 'Sequence' : ''}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 dark:text-gray-100 max-w-xs">
                    {interaction.type === 'clicked' && interaction.clickedUrl && (
                      <span className="text-blue-600 dark:text-blue-400 truncate block">
                        {interaction.clickedUrl}
                      </span>
                    )}
                    {interaction.type === 'replied' && interaction.replyContent && (
                      <span className="text-gray-600 dark:text-gray-400 truncate block">
                        {interaction.replyContent}
                      </span>
                    )}
                    {interaction.type === 'bounced' && interaction.bounceReason && (
                      <span className="text-red-600 dark:text-red-400 truncate block">
                        {interaction.bounceReason}
                      </span>
                    )}
                    {!interaction.clickedUrl && !interaction.replyContent && !interaction.bounceReason && (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {formatDistanceToNow(new Date(interaction.timestamp), { addSuffix: true })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}