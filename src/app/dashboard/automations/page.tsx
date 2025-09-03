'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-hot-toast'

interface Automation {
  id: string
  name: string
  description?: string
  triggerEvent: string
  status: string
  trackingEnabled: boolean
  totalEntered: number
  currentlyActive: number
  totalCompleted: number
  totalExecutions: number
  activeExecutions: number
  nodeCount: number
  hasConditions: boolean
  createdAt: string
  updatedAt: string
}

export default function AutomationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.id) {
      router.push('/auth/signin')
      return
    }

    fetchAutomations()
  }, [session, status, router])

  const fetchAutomations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/automations')
      
      if (!response.ok) {
        throw new Error('Failed to fetch automations')
      }

      const data = await response.json()
      setAutomations(data.automations || [])
    } catch (error) {
      console.error('Error loading automations:', error)
      toast.error('Failed to load automations')
    } finally {
      setLoading(false)
    }
  }

  const handleControlAutomation = async (id: string, action: 'start' | 'pause' | 'stop' | 'resume') => {
    try {
      setProcessingId(id)
      const response = await fetch(`/api/automations/${id}/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to control automation')
      }

      const result = await response.json()
      toast.success(result.message)
      await fetchAutomations()
    } catch (error: any) {
      console.error('Error controlling automation:', error)
      toast.error(error.message || 'Failed to control automation')
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const classes = {
      'DRAFT': 'bg-gray-100 text-gray-800',
      'ACTIVE': 'bg-green-100 text-green-800',
      'PAUSED': 'bg-yellow-100 text-yellow-800',
      'STOPPED': 'bg-red-100 text-red-800',
      'ARCHIVED': 'bg-gray-100 text-gray-500'
    }[status] || 'bg-gray-100 text-gray-800'

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}>
        {status}
      </span>
    )
  }

  const getTriggerIcon = (triggerEvent: string) => {
    const icons = {
      'NEW_SUBSCRIBER': '👥',
      'SPECIFIC_DATE': '📅',
      'SUBSCRIBER_SEGMENT': '🏷️',
      'WEBHOOK': '🔗',
      'MANUAL': '✋'
    }
    return icons[triggerEvent as keyof typeof icons] || '⚡'
  }

  const getActionButtons = (automation: Automation) => {
    const isProcessing = processingId === automation.id

    switch (automation.status) {
      case 'DRAFT':
        return (
          <button
            onClick={() => handleControlAutomation(automation.id, 'start')}
            disabled={isProcessing}
            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            {isProcessing ? 'Starting...' : 'Start'}
          </button>
        )
      case 'ACTIVE':
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleControlAutomation(automation.id, 'pause')}
              disabled={isProcessing}
              className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {isProcessing ? '...' : 'Pause'}
            </button>
            <button
              onClick={() => handleControlAutomation(automation.id, 'stop')}
              disabled={isProcessing}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              {isProcessing ? '...' : 'Stop'}
            </button>
          </div>
        )
      case 'PAUSED':
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleControlAutomation(automation.id, 'resume')}
              disabled={isProcessing}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {isProcessing ? 'Resuming...' : 'Resume'}
            </button>
            <button
              onClick={() => handleControlAutomation(automation.id, 'stop')}
              disabled={isProcessing}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              {isProcessing ? '...' : 'Stop'}
            </button>
          </div>
        )
      case 'STOPPED':
        return (
          <span className="text-sm text-gray-500">Stopped</span>
        )
      default:
        return null
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Email Automations</h1>
          <p className="mt-2 text-gray-600">
            Create automated email workflows triggered by subscriber actions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/automations/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Automation
          </Link>
        </div>
      </div>

      {automations.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">🤖</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No automations yet</h3>
          <p className="text-gray-600 mb-4">
            Create your first automation to send targeted emails based on subscriber behavior
          </p>
          <Link
            href="/dashboard/automations/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Your First Automation
          </Link>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Automation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trigger
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {automations.map((automation) => (
                <tr key={automation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <Link
                        href={`/dashboard/automations/${automation.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-500"
                      >
                        {automation.name}
                      </Link>
                      {automation.description && (
                        <p className="text-sm text-gray-500">{automation.description}</p>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        {automation.nodeCount} nodes
                        {automation.hasConditions && ' • Has conditions'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-lg mr-2">{getTriggerIcon(automation.triggerEvent)}</span>
                      <span className="text-sm text-gray-900">
                        {automation.triggerEvent.replace('_', ' ').toLowerCase()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(automation.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>{automation.totalEntered} entered</div>
                      <div className="text-xs text-gray-500">
                        {automation.currentlyActive} active • {automation.totalCompleted} completed
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center gap-2">
                      {getActionButtons(automation)}
                      <Link
                        href={`/dashboard/automations/${automation.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}