'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'

interface Enrollment {
  id: string
  status: string
  createdAt: Date
  updatedAt: Date
  currentStep: number | string
  completedAt: Date | null
  pausedAt: Date | null
  contact: {
    email: string
    firstName: string | null
    lastName: string | null
    company: string | null
  }
}

interface Step {
  id: string
  stepNumber: number
  type: string
  subject?: string
  delay?: number
}

interface EnrollmentEvent {
  enrollmentId: string
  opens: number
  clicks: number
  replies: number
  lastActivity: Date | null
}

interface EnrollmentsListProps {
  enrollments: Enrollment[]
  steps: Step[]
  trackingEnabled: boolean
  sequenceId: string
}

export default function EnrollmentsList({ enrollments, steps, trackingEnabled, sequenceId }: EnrollmentsListProps) {
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'enrolled' | 'activity' | 'step'>('enrolled')
  const [currentPage, setCurrentPage] = useState(1)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [enrollmentEvents, setEnrollmentEvents] = useState<Record<string, EnrollmentEvent>>({})
  const [eventsLoading, setEventsLoading] = useState(false)
  const itemsPerPage = 10

  // Fetch enrollment events for engagement tracking
  useEffect(() => {
    if (trackingEnabled && enrollments.length > 0) {
      fetchEnrollmentEvents()
    }
  }, [sequenceId, trackingEnabled, enrollments])

  const fetchEnrollmentEvents = async () => {
    if (!trackingEnabled) return
    
    setEventsLoading(true)
    try {
      const response = await fetch(`/api/sequences/${sequenceId}/events`)
      if (response.ok) {
        const data = await response.json()
        const events = data.events || []
        
        // Aggregate events by enrollment ID
        const eventsByEnrollment: Record<string, EnrollmentEvent> = {}
        
        events.forEach((event: any) => {
          const enrollmentId = event.enrollment?.id || event.enrollmentId
          if (!enrollmentId) return
          
          if (!eventsByEnrollment[enrollmentId]) {
            eventsByEnrollment[enrollmentId] = {
              enrollmentId,
              opens: 0,
              clicks: 0,
              replies: 0,
              lastActivity: null
            }
          }
          
          const eventEntry = eventsByEnrollment[enrollmentId]
          
          if (event.eventType === 'OPENED') {
            eventEntry.opens++
          } else if (event.eventType === 'CLICKED') {
            eventEntry.clicks++
          } else if (event.eventType === 'REPLIED') {
            eventEntry.replies++
          }
          
          // Update last activity
          const eventDate = new Date(event.createdAt)
          if (!eventEntry.lastActivity || eventDate > eventEntry.lastActivity) {
            eventEntry.lastActivity = eventDate
          }
        })
        
        setEnrollmentEvents(eventsByEnrollment)
      }
    } catch (error) {
      console.error('Failed to fetch enrollment events:', error)
    } finally {
      setEventsLoading(false)
    }
  }

  const handlePauseResume = async (enrollmentId: string, action: 'pause' | 'resume') => {
    setActionLoading(enrollmentId)
    try {
      const response = await fetch(`/api/sequences/enrollments/${enrollmentId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${action} enrollment`)
      }
      
      // Refresh the page to show updated status
      window.location.reload()
    } catch (error) {
      console.error(`Error ${action}ing enrollment:`, error)
      alert(error instanceof Error ? error.message : `Failed to ${action} enrollment`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemove = async (enrollmentId: string, contactEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${contactEmail} from this sequence? This action cannot be undone.`)) {
      return
    }

    setActionLoading(enrollmentId)
    try {
      const response = await fetch(`/api/sequences/enrollments/${enrollmentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove enrollment')
      }
      
      // Refresh the page to show updated list
      window.location.reload()
    } catch (error) {
      console.error('Error removing enrollment:', error)
      alert(error instanceof Error ? error.message : 'Failed to remove enrollment')
    } finally {
      setActionLoading(null)
    }
  }

  const handleExportCsv = async () => {
    try {
      const csvContent = [
        // Headers
        ['Email', 'Name', 'Company', 'Status', 'Current Step', 'Enrolled Date', 'Last Updated'].join(','),
        // Data rows
        ...filteredEnrollments.map(enrollment => [
          enrollment.contact.email,
          `${enrollment.contact.firstName || ''} ${enrollment.contact.lastName || ''}`.trim(),
          enrollment.contact.company || '',
          enrollment.status,
          typeof enrollment.currentStep === 'string' ? enrollment.currentStep : enrollment.currentStep.toString(),
          new Date(enrollment.createdAt).toLocaleDateString(),
          new Date(enrollment.updatedAt).toLocaleDateString()
        ].join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `sequence_enrollments_${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      console.error('Error exporting CSV:', error)
      alert('Failed to export CSV')
    }
  }

  // Filter enrollments
  const filteredEnrollments = enrollments.filter(enrollment => {
    // Apply status filter
    if (filter !== 'all') {
      if (filter === 'active' && enrollment.status !== 'ACTIVE') return false
      if (filter === 'completed' && enrollment.status !== 'COMPLETED') return false
      if (filter === 'paused' && enrollment.status !== 'PAUSED') return false
      if (filter === 'unsubscribed' && enrollment.status !== 'UNSUBSCRIBED') return false
      if (filter === 'engaged') {
        const events = enrollmentEvents[enrollment.id]
        return events && (events.opens > 0 || events.clicks > 0 || events.replies > 0)
      }
    }

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      const fullName = `${enrollment.contact.firstName || ''} ${enrollment.contact.lastName || ''}`.toLowerCase()
      return (
        enrollment.contact.email.toLowerCase().includes(searchLower) ||
        fullName.includes(searchLower) ||
        enrollment.contact.company?.toLowerCase().includes(searchLower)
      )
    }

    return true
  })

  // Sort enrollments
  const sortedEnrollments = [...filteredEnrollments].sort((a, b) => {
    switch (sortBy) {
      case 'activity':
        const aEvents = enrollmentEvents[a.id]
        const bEvents = enrollmentEvents[b.id]
        const aTime = aEvents?.lastActivity ? new Date(aEvents.lastActivity).getTime() : new Date(a.updatedAt).getTime()
        const bTime = bEvents?.lastActivity ? new Date(bEvents.lastActivity).getTime() : new Date(b.updatedAt).getTime()
        return bTime - aTime
      case 'step':
        const aStep = typeof a.currentStep === 'string' ? parseInt(a.currentStep) : a.currentStep
        const bStep = typeof b.currentStep === 'string' ? parseInt(b.currentStep) : b.currentStep
        return bStep - aStep
      default: // enrolled
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
  })

  // Pagination
  const totalPages = Math.ceil(sortedEnrollments.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedEnrollments = sortedEnrollments.slice(startIndex, startIndex + itemsPerPage)

  const getStatusBadge = (status: string) => {
    const badges = {
      ACTIVE: 'bg-green-100 text-green-800',
      COMPLETED: 'bg-blue-100 text-blue-800',
      PAUSED: 'bg-yellow-100 text-yellow-800',
      UNSUBSCRIBED: 'bg-red-100 text-red-800'
    }
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800'
  }

  const getStepInfo = (stepNumber: number) => {
    const step = steps.find(s => s.stepNumber === stepNumber)
    if (!step) return 'Unknown step'
    
    if (step.type === 'email' && step.subject) {
      return step.subject
    } else if (step.type === 'delay') {
      return `Delay: ${step.delay} days`
    } else if (step.type === 'condition') {
      return 'Condition check'
    }
    return `Step ${stepNumber}`
  }

  const getEngagementScore = (enrollmentId: string) => {
    const events = enrollmentEvents[enrollmentId]
    if (!events) return 0
    
    const totalEvents = events.opens + events.clicks + events.replies
    // Weight different actions: replies=3, clicks=2, opens=1
    const weightedScore = (events.replies * 3) + (events.clicks * 2) + (events.opens * 1)
    return Math.min(100, Math.round(weightedScore * 5)) // Scale to 0-100
  }

  return (
    <div className="mt-8 bg-white rounded-lg shadow dark:shadow-lg">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Enrolled Contacts</h2>
          <div className="text-sm text-gray-600">
            {filteredEnrollments.length} of {enrollments.length} enrollments
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by email, name, or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Enrollments</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="paused">Paused</option>
            <option value="unsubscribed">Unsubscribed</option>
            <option value="engaged">Engaged</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="enrolled">Sort by Enrolled Date</option>
            <option value="activity">Sort by Last Activity</option>
            <option value="step">Sort by Current Step</option>
          </select>

          {/* Export */}
          <button 
            onClick={handleExportCsv}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 transition"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Enrollments Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Current Step
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Enrolled
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Last Activity
              </th>
              {trackingEnabled && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Engagement
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedEnrollments.map((enrollment) => {
              const events = enrollmentEvents[enrollment.id]
              const engagementScore = getEngagementScore(enrollment.id)
              const currentStepNum = typeof enrollment.currentStep === 'string' ? parseInt(enrollment.currentStep) : enrollment.currentStep
              
              return (
                <tr key={enrollment.id} className="hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {enrollment.contact.email}
                      </div>
                      {(enrollment.contact.firstName || enrollment.contact.lastName) && (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {enrollment.contact.firstName} {enrollment.contact.lastName}
                          {enrollment.contact.company && ` • ${enrollment.contact.company}`}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(enrollment.status)}`}>
                      {enrollment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        Step {currentStepNum} of {steps.length}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 truncate max-w-xs">
                        {getStepInfo(currentStepNum)}
                      </div>
                      {enrollment.status === 'ACTIVE' && (
                        <div className="mt-1">
                          <div className="bg-gray-200 rounded-full h-2 w-32">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${(currentStepNum / steps.length) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDistanceToNow(new Date(enrollment.createdAt), { addSuffix: true })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {(() => {
                      const events = enrollmentEvents[enrollment.id]
                      if (eventsLoading) return <span className="text-gray-400">Loading...</span>
                      if (!trackingEnabled) return <span className="text-gray-400">Tracking disabled</span>
                      if (!events || !events.lastActivity) return <span className="text-gray-400">No activity</span>
                      return formatDistanceToNow(events.lastActivity, { addSuffix: true })
                    })()} 
                  </td>
                  {trackingEnabled && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span>{eventsLoading ? '-' : (events?.opens || 0)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                              </svg>
                              <span>{eventsLoading ? '-' : (events?.clicks || 0)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                              </svg>
                              <span>{eventsLoading ? '-' : (events?.replies || 0)}</span>
                            </div>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${
                                  engagementScore >= 75 ? 'bg-green-500' :
                                  engagementScore >= 50 ? 'bg-blue-500' :
                                  engagementScore >= 25 ? 'bg-yellow-500' :
                                  engagementScore > 0 ? 'bg-orange-500' : 'bg-gray-400'
                                }`}
                                style={{ width: `${engagementScore}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">
                              {eventsLoading ? '-' : `${engagementScore}%`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      {enrollment.status === 'ACTIVE' && (
                        <button 
                          onClick={() => handlePauseResume(enrollment.id, 'pause')}
                          disabled={actionLoading === enrollment.id}
                          className="text-yellow-600 hover:text-yellow-700 disabled:opacity-50"
                        >
                          {actionLoading === enrollment.id ? 'Pausing...' : 'Pause'}
                        </button>
                      )}
                      {enrollment.status === 'PAUSED' && (
                        <button 
                          onClick={() => handlePauseResume(enrollment.id, 'resume')}
                          disabled={actionLoading === enrollment.id}
                          className="text-green-600 hover:text-green-700 disabled:opacity-50"
                        >
                          {actionLoading === enrollment.id ? 'Resuming...' : 'Resume'}
                        </button>
                      )}
                      <button className="text-blue-600 hover:text-blue-700">
                        View
                      </button>
                      <button 
                        onClick={() => handleRemove(enrollment.id, enrollment.contact.email)}
                        disabled={actionLoading === enrollment.id}
                        className="text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        {actionLoading === enrollment.id ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-800 dark:text-gray-200 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-800 dark:text-gray-200 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-800 dark:text-gray-200">
                Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(startIndex + itemsPerPage, sortedEnrollments.length)}
                </span>{' '}
                of <span className="font-medium">{sortedEnrollments.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const pageNumber = i + 1
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === pageNumber
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  )
                })}
                {totalPages > 5 && (
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white text-sm font-medium text-gray-800 dark:text-gray-200">
                    ...
                  </span>
                )}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 disabled:opacity-50"
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

      {/* Summary Stats */}
      <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Active Enrollments</h3>
            <p className="text-2xl font-bold text-green-600">
              {enrollments.filter(e => e.status === 'ACTIVE').length}
            </p>
            <p className="text-sm text-gray-600">Currently receiving emails</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Completion Rate</h3>
            <p className="text-2xl font-bold text-blue-600">
              {enrollments.length > 0 
                ? Math.round((enrollments.filter(e => e.status === 'COMPLETED').length / enrollments.length) * 100)
                : 0}%
            </p>
            <p className="text-sm text-gray-600">
              {enrollments.filter(e => e.status === 'COMPLETED').length} completed
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Average Progress</h3>
            <p className="text-2xl font-bold text-purple-600">
              {steps.length > 0 && enrollments.length > 0
                ? Math.round((enrollments.reduce((sum, e) => {
                    const stepNum = typeof e.currentStep === 'string' ? parseInt(e.currentStep) : e.currentStep
                    return sum + stepNum
                  }, 0) / enrollments.length / steps.length) * 100)
                : 0}%
            </p>
            <p className="text-sm text-gray-600">Through sequence</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Engagement Rate</h3>
            <p className="text-2xl font-bold text-teal-600">
              {eventsLoading ? '-' : (
                enrollments.length > 0 
                  ? Math.round((Object.values(enrollmentEvents).filter(e => e.opens > 0 || e.clicks > 0 || e.replies > 0).length / enrollments.length) * 100)
                  : 0
              )}%
            </p>
            <p className="text-sm text-gray-600">
              {Object.values(enrollmentEvents).filter(e => e.opens > 0 || e.clicks > 0 || e.replies > 0).length} engaged
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}