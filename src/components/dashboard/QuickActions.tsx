'use client'

import Link from 'next/link'

interface QuickActionsProps {
  gmailConnected: boolean
}

export default function QuickActions({ gmailConnected }: QuickActionsProps) {
  const actions = [
    {
      title: 'New Campaign',
      description: 'Create and send a new email campaign',
      href: '/dashboard/campaigns/new',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      disabled: !gmailConnected
    },
    {
      title: 'Import Contacts',
      description: 'Upload contacts from a CSV file',
      href: '/dashboard/contacts/import',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      disabled: false
    },
    {
      title: 'Create Sequence',
      description: 'Set up automated follow-up emails',
      href: '/dashboard/sequences/new',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      disabled: !gmailConnected
    },
    {
      title: 'View Analytics',
      description: 'Check campaign performance metrics',
      href: '/dashboard/analytics',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      disabled: false
    }
  ]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Quick Actions</h2>
      </div>
      
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {actions.map((action, index) => (
          <Link
            key={index}
            href={action.disabled ? '#' : action.href}
            className={`p-4 border rounded-lg transition ${
              action.disabled
                ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-not-allowed opacity-50'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:shadow-sm'
            }`}
            onClick={action.disabled ? (e) => e.preventDefault() : undefined}
          >
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-lg ${action.disabled ? 'bg-gray-200' : 'bg-blue-50 text-blue-600'}`}>
                {action.icon}
              </div>
              <div>
                <h3 className={`font-medium ${action.disabled ? 'text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                  {action.title}
                </h3>
                <p className={`text-sm mt-1 ${action.disabled ? 'text-gray-400' : 'text-gray-600 dark:text-gray-400'}`}>
                  {action.description}
                </p>
                {action.disabled && (
                  <p className="text-xs text-red-500 mt-1">Gmail connection required</p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}