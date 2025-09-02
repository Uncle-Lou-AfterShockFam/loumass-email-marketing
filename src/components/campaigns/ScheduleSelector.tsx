'use client'

import { useState } from 'react'
import { format, addDays, addHours, isBefore } from 'date-fns'

interface ScheduleSelectorProps {
  scheduledFor?: string
  onChange: (scheduledFor: string) => void
}

export default function ScheduleSelector({ scheduledFor, onChange }: ScheduleSelectorProps) {
  const [scheduleType, setScheduleType] = useState<'now' | 'later'>(() => {
    return scheduledFor && scheduledFor !== '' ? 'later' : 'now'
  })

  const handleScheduleTypeChange = (type: 'now' | 'later') => {
    setScheduleType(type)
    if (type === 'now') {
      onChange('')
    } else if (type === 'later' && (!scheduledFor || scheduledFor === '')) {
      // Default to 1 hour from now
      const defaultTime = addHours(new Date(), 1)
      onChange(format(defaultTime, "yyyy-MM-dd'T'HH:mm"))
    }
  }

  const handleDateTimeChange = (value: string) => {
    onChange(value)
  }

  const getQuickScheduleOptions = () => {
    const now = new Date()
    return [
      {
        label: 'In 1 hour',
        value: format(addHours(now, 1), "yyyy-MM-dd'T'HH:mm")
      },
      {
        label: 'Tomorrow morning (9 AM)',
        value: format(new Date(addDays(now, 1).setHours(9, 0, 0, 0)), "yyyy-MM-dd'T'HH:mm")
      },
      {
        label: 'Monday morning (9 AM)',
        value: (() => {
          const monday = new Date(now)
          const daysUntilMonday = (1 + 7 - monday.getDay()) % 7 || 7
          monday.setDate(monday.getDate() + daysUntilMonday)
          monday.setHours(9, 0, 0, 0)
          return format(monday, "yyyy-MM-dd'T'HH:mm")
        })()
      }
    ]
  }

  const isValidDateTime = (dateTimeString: string) => {
    const selectedDate = new Date(dateTimeString)
    const now = new Date()
    return !isBefore(selectedDate, now)
  }

  const quickOptions = getQuickScheduleOptions()

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Schedule Campaign</h2>
      
      <div className="space-y-6">
        {/* Schedule Type Selection */}
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="radio"
              name="scheduleType"
              value="now"
              checked={scheduleType === 'now'}
              onChange={() => handleScheduleTypeChange('now')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
            />
            <span className="ml-3">
              <span className="font-medium text-gray-900 dark:text-gray-100">Send immediately</span>
              <span className="block text-sm text-gray-600 dark:text-gray-400">Campaign will be sent as soon as you save</span>
            </span>
          </label>
          
          <label className="flex items-center">
            <input
              type="radio"
              name="scheduleType"
              value="later"
              checked={scheduleType === 'later'}
              onChange={() => handleScheduleTypeChange('later')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
            />
            <span className="ml-3">
              <span className="font-medium text-gray-900 dark:text-gray-100">Schedule for later</span>
              <span className="block text-sm text-gray-600 dark:text-gray-400">Choose a specific date and time</span>
            </span>
          </label>
        </div>

        {/* Scheduling Options */}
        {scheduleType === 'later' && (
          <div className="space-y-4 pl-7">
            {/* Quick Options */}
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Quick options:</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {quickOptions.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => handleDateTimeChange(option.value)}
                    className={`px-3 py-2 text-sm rounded-lg border transition ${
                      scheduledFor === option.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date/Time Picker */}
            <div>
              <label htmlFor="customDateTime" className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                Or choose custom date and time:
              </label>
              <input
                type="datetime-local"
                id="customDateTime"
                value={scheduledFor || ''}
                onChange={(e) => handleDateTimeChange(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
              
              {scheduledFor && !isValidDateTime(scheduledFor) && (
                <p className="text-red-600 text-sm mt-1">
                  Please select a future date and time
                </p>
              )}
            </div>

            {/* Preview */}
            {scheduledFor && isValidDateTime(scheduledFor) && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Campaign will be sent:</strong>{' '}
                  {format(new Date(scheduledFor), 'EEEE, MMMM d, yyyy \'at\' h:mm a')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Important Notes */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <svg className="flex-shrink-0 w-5 h-5 text-yellow-600 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-sm">
              <p className="font-medium text-yellow-800 mb-1">Important scheduling notes:</p>
              <ul className="text-yellow-700 space-y-1">
                <li>• Scheduled campaigns can be edited or cancelled before the send time</li>
                <li>• Times are based on your local timezone</li>
                <li>• We recommend avoiding weekends and holidays for better engagement</li>
                <li>• Consider your audience's timezone when scheduling</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Best Practice Tips */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <svg className="flex-shrink-0 w-5 h-5 text-green-600 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm">
              <p className="font-medium text-green-800 mb-1">Best sending times:</p>
              <ul className="text-green-700 space-y-1">
                <li>• <strong>Tuesday-Thursday:</strong> 9-11 AM or 1-3 PM</li>
                <li>• <strong>Avoid:</strong> Mondays before 10 AM, Fridays after 3 PM</li>
                <li>• <strong>B2B:</strong> Weekdays during business hours work best</li>
                <li>• <strong>B2C:</strong> Evenings and weekends can be effective</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}