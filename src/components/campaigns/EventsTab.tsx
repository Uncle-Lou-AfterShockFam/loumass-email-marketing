'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'

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
  const [filter, setFilter] = useState<'all' | 'opens' | 'clicks'>('all')
  const [userIp, setUserIp] = useState<string>('')

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
        setEvents(data.events)
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

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
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
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Tracking Events</h2>
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
          </div>
        </div>
        {userIp && (
          <p className="text-xs text-gray-500 mt-2">
            Your IP: {userIp} (events from your IP are marked)
          </p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Event
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IP Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No events yet
                </td>
              </tr>
            ) : (
              filteredEvents.map((event) => (
                <tr 
                  key={event.id} 
                  className={isUserIp(event.ipAddress) ? 'bg-yellow-50' : ''}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getEventIcon(event.eventType)}
                      <span className="text-sm font-medium text-gray-900">
                        {event.eventType === 'OPENED' ? 'Opened' : 
                         event.eventType === 'CLICKED' ? 'Clicked' : 
                         event.eventType}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {event.recipient.contact.email}
                    </div>
                    {event.recipient.contact.firstName && (
                      <div className="text-xs text-gray-500">
                        {event.recipient.contact.firstName} {event.recipient.contact.lastName}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {event.ipAddress || 'Unknown'}
                      {isUserIp(event.ipAddress) && (
                        <span className="ml-2 text-xs text-yellow-600 font-medium">
                          (Your IP)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <LocationCell ip={event.ipAddress} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
    </div>
  )
}

function LocationCell({ ip }: { ip?: string }) {
  const [location, setLocation] = useState<string>('Loading...')

  useEffect(() => {
    if (!ip) {
      setLocation('Unknown')
      return
    }

    fetch(`https://ipapi.co/${ip}/json/`)
      .then(res => res.json())
      .then(data => {
        if (data.city && data.region) {
          setLocation(`${data.city}, ${data.region}, ${data.country_name}`)
        } else {
          setLocation('Unknown')
        }
      })
      .catch(() => setLocation('Unknown'))
  }, [ip])

  return <div className="text-sm text-gray-900">{location}</div>
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