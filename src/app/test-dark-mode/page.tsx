'use client'

import { useState } from 'react'
import CampaignStats from '@/components/campaigns/CampaignStats'
import ContactSelector from '@/components/campaigns/ContactSelector'
import CampaignEditor from '@/components/campaigns/CampaignEditor'

export default function TestDarkMode() {
  const [isDark, setIsDark] = useState(false)
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([])
  const [content, setContent] = useState('')

  const toggleDarkMode = () => {
    if (!isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    setIsDark(!isDark)
  }

  const mockStats = {
    total: 42,
    sent: 28,
    draft: 8,
    scheduled: 6
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Dark Mode Test Page
          </h1>
          <button
            onClick={toggleDarkMode}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Toggle {isDark ? 'Light' : 'Dark'} Mode
          </button>
        </div>

        <div className="space-y-8">
          {/* Test Campaign Stats */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Campaign Statistics Component
            </h2>
            <CampaignStats stats={mockStats} />
          </section>

          {/* Test Campaign Editor */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Campaign Editor Component
            </h2>
            <CampaignEditor 
              content={content}
              onChange={setContent}
            />
          </section>

          {/* Test Contact Selector */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Contact Selector Component
            </h2>
            <ContactSelector
              selectedContactIds={selectedContactIds}
              onChange={setSelectedContactIds}
            />
          </section>

          {/* Test various UI elements */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              UI Elements Test
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Input Field
                </label>
                <input
                  type="text"
                  placeholder="Test input field"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select Field
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  <option>Option 1</option>
                  <option>Option 2</option>
                  <option>Option 3</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Textarea
                </label>
                <textarea
                  rows={3}
                  placeholder="Test textarea"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="flex space-x-2">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Primary Button
                </button>
                <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                  Secondary Button
                </button>
              </div>

              <div className="flex space-x-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 px-3 py-1 rounded">
                  Blue Badge
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 px-3 py-1 rounded">
                  Green Badge
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 px-3 py-1 rounded">
                  Yellow Badge
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 px-3 py-1 rounded">
                  Red Badge
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-gray-600 dark:text-gray-400">
                  This is secondary text that should have good contrast in both light and dark modes.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}