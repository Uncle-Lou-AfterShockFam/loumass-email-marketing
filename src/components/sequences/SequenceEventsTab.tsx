'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'

interface SequenceEvent {
  id: string
  eventType: 'OPENED' | 'CLICKED' | 'REPLIED'
  eventData: any
  stepIndex: number
  createdAt: Date
  enrollment: {
    contact: {
      email: string
      firstName?: string
      lastName?: string
    }
    sequence: {
      name: string
    }
  }
}

interface SequenceEventsTabProps {
  sequenceId: string
  steps: any[]
}

export default function SequenceEventsTab({ sequenceId, steps }: SequenceEventsTabProps) {
  const [events, setEvents] = useState<SequenceEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'opens' | 'clicks' | 'replies'>('all')
  const [stepFilter, setStepFilter] = useState<number | 'all'>('all')
  const [userIp, setUserIp] = useState<string>('')

  useEffect(() => {
    fetchEvents()
    fetchUserIp()
  }, [sequenceId])

  const fetchUserIp = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json')
      const data = await response.json()
      setUserIp(data.ip)
    } catch (error) {
      console.error('Failed to fetch user IP:', error)
    }
  }

  const fetchEvents = async () => {
    try {
      const response = await fetch(`/api/sequences/${sequenceId}/events`)
      if (response.ok) {
        const data = await response.json()
        setEvents(data.events || [])
      }
    } catch (error) {
      console.error('Failed to fetch sequence events:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEvents = events.filter(event => {
    const typeMatch = filter === 'all' || 
      (filter === 'opens' && event.eventType === 'OPENED') ||
      (filter === 'clicks' && event.eventType === 'CLICKED') ||
      (filter === 'replies' && event.eventType === 'REPLIED')
    
    const stepMatch = stepFilter === 'all' || event.stepIndex === stepFilter

    return typeMatch && stepMatch
  })

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'OPENED':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )
      case 'CLICKED':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )
      case 'REPLIED':
        return (
          <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        )
      default:
        return null
    }
  }

  const isUserIp = (eventIp?: string) => {
    if (!eventIp || !userIp) return false
    const userOctets = userIp.split('.').slice(0, 3).join('.')
    const eventOctets = eventIp.split('.').slice(0, 3).join('.')
    return userOctets === eventOctets
  }

  const isGmailProxy = (ip?: string) => {
    if (!ip) return false
    const gmailRanges = ['66.102', '66.249', '209.85', '172.217', '142.250', '142.251']
    const ipPrefix = ip.split('.').slice(0, 2).join('.')
    return gmailRanges.includes(ipPrefix)
  }

  const getStepName = (stepIndex: number) => {
    const step = steps[stepIndex]
    if (!step) return `Step ${stepIndex + 1}`
    return step.subject || `${step.type} - Step ${stepIndex + 1}`
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Sequence Events</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-sm rounded-lg ${
                filter === 'all' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Events
            </button>
            <button
              onClick={() => setFilter('opens')}
              className={`px-3 py-1 text-sm rounded-lg ${
                filter === 'opens' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Opens
            </button>
            <button
              onClick={() => setFilter('clicks')}
              className={`px-3 py-1 text-sm rounded-lg ${
                filter === 'clicks' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Clicks
            </button>
            <button
              onClick={() => setFilter('replies')}
              className={`px-3 py-1 text-sm rounded-lg ${
                filter === 'replies' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Replies
            </button>
          </div>
        </div>

        {/* Step Filter */}
        <div className="flex items-center gap-2 mb-4">
          <label className="text-sm font-medium text-gray-800 dark:text-gray-200">Filter by Step:</label>
          <select
            value={stepFilter}
            onChange={(e) => setStepFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1"
          >
            <option value="all">All Steps</option>
            {steps.map((step, index) => (
              <option key={index} value={index}>
                Step {index + 1}: {step.subject || step.type}
              </option>
            ))}
          </select>
        </div>

        {userIp && (
          <div className="space-y-1">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Your IP: {userIp} (events from your IP are highlighted)
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <span className="inline-block w-3 h-3 bg-purple-100 rounded mr-1"></span>
              Purple = Gmail proxy | 
              <span className="inline-block w-3 h-3 bg-yellow-100 rounded mx-1"></span>
              Yellow = Your IP
            </p>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Event
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Step
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                IP Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-600 dark:text-gray-400">
                  No events yet
                </td>
              </tr>
            ) : (
              filteredEvents.map((event) => (
                <tr 
                  key={event.id} 
                  className={
                    isUserIp(event.eventData?.ipAddress) ? 'bg-yellow-50' : 
                    isGmailProxy(event.eventData?.ipAddress) ? 'bg-purple-50' : ''
                  }
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getEventIcon(event.eventType)}
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {event.eventType === 'OPENED' ? 'Opened' : 
                         event.eventType === 'CLICKED' ? 'Clicked' : 
                         event.eventType === 'REPLIED' ? 'Replied' :
                         event.eventType}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {getStepName(event.stepIndex)}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Step {event.stepIndex + 1}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {event.enrollment.contact.email}
                    </div>
                    {event.enrollment.contact.firstName && (
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {event.enrollment.contact.firstName} {event.enrollment.contact.lastName}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {event.eventData?.ipAddress || 'Unknown'}
                      {isUserIp(event.eventData?.ipAddress) && (
                        <span className="ml-2 text-xs text-yellow-600 font-medium">
                          (Your IP)
                        </span>
                      )}
                      {isGmailProxy(event.eventData?.ipAddress) && (
                        <span className="ml-2 text-xs text-purple-600 font-medium">
                          (Gmail Proxy)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {event.eventType === 'CLICKED' && event.eventData?.url && (
                      <a 
                        href={event.eventData.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 truncate block max-w-xs"
                      >
                        {event.eventData.url}
                      </a>
                    )}
                    {event.eventType === 'REPLIED' && event.eventData?.subject && (
                      <div>
                        <div className="text-xs">
                          <span className="font-medium">Re: </span>
                          {event.eventData.subject}
                        </div>
                        {event.eventData?.messageBody && (
                          <div className="text-xs text-gray-400 mt-1 truncate max-w-xs">
                            {event.eventData.messageBody.substring(0, 100)}...
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}