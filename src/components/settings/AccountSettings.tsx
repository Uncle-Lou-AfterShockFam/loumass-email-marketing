'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AccountSettingsProps {
  user: {
    id: string
    email: string
    name: string | null
    fromName?: string | null
    dailyEmailLimit?: number
  } | null
}

export default function AccountSettings({ user }: AccountSettingsProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || '',
    fromName: user?.fromName || '',
    dailyEmailLimit: user?.dailyEmailLimit || 500
  })

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setIsSaving(true)
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setIsEditing(false)
        router.refresh()
      } else {
        alert('Failed to save settings')
      }
    } catch (error) {
      alert('An error occurred. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!user) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Account Settings</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 border border-blue-300 rounded-md hover:bg-blue-50"
          >
            Edit
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-800 dark:text-gray-200">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={user.email}
              disabled
              className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-400"
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-800 dark:text-gray-200">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="fromName" className="block text-sm font-medium text-gray-800 dark:text-gray-200">
              Email "From" Name
            </label>
            <input
              type="text"
              id="fromName"
              value={formData.fromName}
              onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Display name for sent emails (e.g., 'John from ACME')"
            />
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              This name will appear in the "From" field of all your emails
            </p>
          </div>

          <div>
            <label htmlFor="dailyLimit" className="block text-sm font-medium text-gray-800 dark:text-gray-200">
              Daily Email Limit
            </label>
            <input
              type="number"
              id="dailyLimit"
              value={formData.dailyEmailLimit}
              onChange={(e) => setFormData({ ...formData, dailyEmailLimit: parseInt(e.target.value) || 500 })}
              min="1"
              max="2000"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Gmail API allows approximately 500-2000 emails per day depending on your account
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false)
                setFormData({
                  name: user.name || '',
                  fromName: user.fromName || '',
                  dailyEmailLimit: user.dailyEmailLimit || 500
                })
              }}
              className="px-4 py-2 text-gray-800 dark:text-gray-200 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-600">Email Address</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.email}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600">Name</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name || 'Not set'}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600">Email "From" Name</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.fromName || 'Not set'}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600">Daily Email Limit</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.dailyEmailLimit || 500} emails/day</p>
          </div>
          
          <div className="pt-4 border-t">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <h4 className="text-sm font-medium text-blue-900 mb-1">API Limits</h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Gmail API: 250 quota units per second</li>
                <li>• Approximately 500-2000 emails per day</li>
                <li>• 25MB maximum message size</li>
                <li>• Rate limiting applied automatically</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}