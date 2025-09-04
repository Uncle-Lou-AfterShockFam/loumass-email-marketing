'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import ReplyModal from './ReplyModal'

interface EmailEvent {
  id: string
  eventType: 'OPENED' | 'CLICKED' | 'REPLIED' | 'BOUNCED' | 'COMPLAINED'
  eventData: any
  ipAddress?: string
  userAgent?: string
  createdAt: Date
  recipient: {
    contact: {
      email: string
      firstName?: string
      lastName?: string
    }
  }
}

interface EventsTabProps {
  campaignId: string
}

export default function EventsTab({ campaignId }: EventsTabProps) {
  const [events, setEvents] = useState<EmailEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'opens' | 'clicks' | 'replies'>('all')
  const [userIp, setUserIp] = useState<string>('')
  const [selectedReply, setSelectedReply] = useState<EmailEvent | null>(null)
  const [replyModalOpen, setReplyModalOpen] = useState(false)

  useEffect(() => {
    fetchEvents()
    fetchUserIp()
  }, [campaignId])

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
      const response = await fetch(`/api/campaigns/${campaignId}/events`)
      if (response.ok) {
        const data = await response.json()
        setEvents(Array.isArray(data.events) ? data.events : [])
      }
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setLoading(false)
    }
  }

  const getLocationFromIp = async (ip: string) => {
    try {
      const response = await fetch(`https://ipapi.co/${ip}/json/`)
      const data = await response.json()
      return `${data.city}, ${data.region}, ${data.country_name}`
    } catch {
      return 'Unknown'
    }
  }

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true
    if (filter === 'opens') return event.eventType === 'OPENED'
    if (filter === 'clicks') return event.eventType === 'CLICKED'
    if (filter === 'replies') return event.eventType === 'REPLIED'
    return true
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
    // Compare first 3 octets to handle slight variations
    const userOctets = userIp.split('.').slice(0, 3).join('.')
    const eventOctets = eventIp.split('.').slice(0, 3).join('.')
    return userOctets === eventOctets
  }

  const isGmailProxy = (ip?: string) => {
    if (!ip) return false
    // Gmail proxy IPs typically start with 66.102, 66.249, 209.85, etc.
    const gmailRanges = ['66.102', '66.249', '209.85', '172.217', '142.250', '142.251']
    const ipPrefix = ip.split('.').slice(0, 2).join('.')
    return gmailRanges.includes(ipPrefix)
  }

  const isSecurityScanner = (ip?: string, userAgent?: string) => {
    if (!ip) return false
    
    // Known security scanner IP ranges
    const scannerRanges = [
      '23.228', '63.88', '64.15', // Common corporate security scanners
      '52.', '54.', '35.', // AWS ranges (often used by security services)
      '104.', '40.', // Azure/Microsoft security
    ]
    
    // Check if it's a quick click (within first few seconds) - likely automated
    // This would need timestamp comparison logic
    
    // Check IP patterns
    for (const range of scannerRanges) {
      if (ip.startsWith(range)) {
        return true
      }
    }
    
    // Check user agent patterns
    if (userAgent) {
      const scannerAgents = ['bot', 'scan', 'security', 'linkcheck', 'preview']
      const lowerAgent = userAgent.toLowerCase()
      return scannerAgents.some(pattern => lowerAgent.includes(pattern))
    }
    
    return false
  }

  const openReplyModal = (event: EmailEvent) => {
    if (event.eventType === 'REPLIED') {
      setSelectedReply(event)
      setReplyModalOpen(true)
    }
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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Tracking Events</h2>
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
              Opens Only
            </button>
            <button
              onClick={() => setFilter('clicks')}
              className={`px-3 py-1 text-sm rounded-lg ${
                filter === 'clicks' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Clicks Only
            </button>
            <button
              onClick={() => setFilter('replies')}
              className={`px-3 py-1 text-sm rounded-lg ${
                filter === 'replies' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Replies Only
            </button>
          </div>
        </div>
        {userIp && (
          <div className="mt-2 space-y-1">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Your IP: {userIp} (events from your IP are marked)
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <span className="inline-block w-3 h-3 bg-purple-100 rounded mr-1"></span>
              Purple = Gmail proxy (1st is pre-fetch, rest are real) | 
              <span className="inline-block w-3 h-3 bg-orange-100 rounded mx-1"></span>
              Orange = Security scanners
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
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                IP Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Location
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
                    isUserIp(event.ipAddress) ? 'bg-yellow-50' : 
                    isGmailProxy(event.ipAddress) ? 'bg-purple-50' : 
                    isSecurityScanner(event.ipAddress, event.userAgent) ? 'bg-orange-50' : ''
                  }
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getEventIcon(event.eventType)}
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {event.eventType === 'OPENED' ? 
                          (event.eventData?.isPreFetch ? 'Pre-fetch' : 
                           event.eventData?.openNumber > 1 ? `Opened (#${event.eventData?.openNumber})` : 
                           'Opened') : 
                         event.eventType === 'CLICKED' ? 'Clicked' : 
                         event.eventType === 'REPLIED' ? 'Replied' :
                         event.eventType}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {event.recipient.contact.email}
                    </div>
                    {event.recipient.contact.firstName && (
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {event.recipient.contact.firstName} {event.recipient.contact.lastName}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {event.ipAddress || 'Unknown'}
                      {isUserIp(event.ipAddress) && (
                        <span className="ml-2 text-xs text-yellow-600 font-medium">
                          (Your IP)
                        </span>
                      )}
                      {isGmailProxy(event.ipAddress) && (
                        <span className="ml-2 text-xs text-purple-600 font-medium">
                          (Gmail Proxy)
                        </span>
                      )}
                      {isSecurityScanner(event.ipAddress, event.userAgent) && (
                        <span className="ml-2 text-xs text-orange-600 font-medium">
                          (Security Scanner)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <LocationCell event={event} />
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
                    {event.eventType === 'REPLIED' && (
                      <div>
                        {event.eventData?.subject && (
                          <div className="text-xs">
                            <span className="font-medium">Re: </span>
                            {event.eventData.subject}
                          </div>
                        )}
                        <button
                          onClick={() => openReplyModal(event)}
                          className="mt-1 text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View Reply
                        </button>
                      </div>
                    )}
                    {event.userAgent && (
                      <DeviceInfo userAgent={event.userAgent} />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Reply Modal */}
      <ReplyModal
        isOpen={replyModalOpen}
        onClose={() => {
          setReplyModalOpen(false)
          setSelectedReply(null)
        }}
        replyData={
          selectedReply
            ? {
                subject: selectedReply.eventData?.subject,
                fromEmail: selectedReply.eventData?.fromEmail,
                date: selectedReply.eventData?.date,
                messageBody: selectedReply.eventData?.messageBody,
                gmailMessageId: selectedReply.eventData?.gmailMessageId,
                gmailThreadId: selectedReply.eventData?.gmailThreadId,
                inReplyTo: selectedReply.eventData?.inReplyTo,
                references: selectedReply.eventData?.references,
                contactName: selectedReply.recipient.contact.firstName
                  ? `${selectedReply.recipient.contact.firstName} ${selectedReply.recipient.contact.lastName || ''}`
                  : undefined,
                campaignName: (selectedReply as any).campaign?.name,
              }
            : null
        }
      />
    </div>
  )
}

function LocationCell({ event }: { event: EmailEvent }) {
  // Check if location is stored in eventData
  const eventData = event.eventData as any
  if (eventData?.location) {
    const { city, region, country } = eventData.location
    if (city && region && country) {
      return <div className="text-sm text-gray-900 dark:text-gray-100">{`${city}, ${region}, ${country}`}</div>
    }
  }
  
  // Fallback to client-side IP lookup for older events
  const [location, setLocation] = useState<string>('Loading...')

  useEffect(() => {
    if (!event.ipAddress) {
      setLocation('Unknown')
      return
    }

    fetch(`https://ipapi.co/${event.ipAddress}/json/`)
      .then(res => res.json())
      .then(data => {
        if (data.city && data.region) {
          setLocation(`${data.city}, ${data.region}, ${data.country_name}`)
        } else {
          setLocation('Unknown')
        }
      })
      .catch(() => setLocation('Unknown'))
  }, [event.ipAddress])

  return <div className="text-sm text-gray-900 dark:text-gray-100">{location}</div>
}

function DeviceInfo({ userAgent }: { userAgent: string }) {
  const getDevice = () => {
    if (/iPhone|iPad|iPod/.test(userAgent)) return 'iOS'
    if (/Android/.test(userAgent)) return 'Android'
    if (/Windows/.test(userAgent)) return 'Windows'
    if (/Mac/.test(userAgent)) return 'Mac'
    return 'Unknown'
  }

  const getBrowser = () => {
    if (/Chrome/.test(userAgent)) return 'Chrome'
    if (/Safari/.test(userAgent)) return 'Safari'
    if (/Firefox/.test(userAgent)) return 'Firefox'
    if (/Edge/.test(userAgent)) return 'Edge'
    return 'Unknown'
  }

  return (
    <div className="text-xs text-gray-400">
      {getDevice()} • {getBrowser()}
    </div>
  )
}