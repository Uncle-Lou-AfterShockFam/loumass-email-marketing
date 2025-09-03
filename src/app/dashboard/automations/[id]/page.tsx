'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import AutomationFlowBuilder from '@/components/automations/AutomationFlowBuilder'

interface Automation {
  id: string
  name: string
  description?: string
  triggerEvent: string
  triggerData?: any
  status: string
  trackingEnabled: boolean
  applyToExisting: boolean
  nodes: any[]
  totalEntered: number
  currentlyActive: number
  totalCompleted: number
  createdAt: string
  updatedAt: string
}

interface AutomationStats {
  totalEntered: number
  currentlyActive: number
  totalCompleted: number
  totalFailed: number
  nodeStats: Array<{
    nodeId: string
    totalPassed: number
    currentPassed: number
    inNode: number
  }>
}

export default function AutomationPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const [automation, setAutomation] = useState<Automation | null>(null)
  const [stats, setStats] = useState<AutomationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [processingAction, setProcessingAction] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'builder' | 'stats' | 'settings'>('builder')

  const automationId = params?.id as string

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.id) {
      router.push('/auth/signin')
      return
    }
    if (!automationId) return

    fetchAutomation()
    fetchStats()
  }, [session, status, router, automationId])

  const fetchAutomation = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/automations/${automationId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Automation not found')
          router.push('/dashboard/automations')
          return
        }
        throw new Error('Failed to fetch automation')
      }

      const data = await response.json()
      setAutomation(data.automation)
    } catch (error) {
      console.error('Error loading automation:', error)
      toast.error('Failed to load automation')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/automations/${automationId}/stats`)
      
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleControlAutomation = async (action: 'start' | 'pause' | 'stop' | 'resume') => {
    try {
      setProcessingAction(action)
      const response = await fetch(`/api/automations/${automationId}/control`, {
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
      await fetchAutomation()
      await fetchStats()
    } catch (error: any) {
      console.error('Error controlling automation:', error)
      toast.error(error.message || 'Failed to control automation')
    } finally {
      setProcessingAction(null)
    }
  }

  const handleSaveAutomation = async (updatedAutomation: Partial<Automation>) => {
    if (!automation) return

    try {
      setSaving(true)
      const response = await fetch(`/api/automations/${automationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedAutomation)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save automation')
      }

      const result = await response.json()
      setAutomation(result.automation)
      toast.success('Automation saved successfully')
    } catch (error: any) {
      console.error('Error saving automation:', error)
      toast.error(error.message || 'Failed to save automation')
    } finally {
      setSaving(false)
    }
  }

  const handleNodesUpdate = (nodes: any[]) => {
    if (!automation) return
    
    const updatedAutomation = { ...automation, nodes }
    setAutomation(updatedAutomation)
    
    // Auto-save nodes after a short delay
    setTimeout(() => {
      handleSaveAutomation({ nodes })
    }, 1000)
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

  const getActionButtons = () => {
    if (!automation) return null
    
    const isProcessing = processingAction !== null

    switch (automation.status) {
      case 'DRAFT':
        return (
          <button
            onClick={() => handleControlAutomation('start')}
            disabled={isProcessing}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            {processingAction === 'start' ? 'Starting...' : 'Start Automation'}
          </button>
        )
      case 'ACTIVE':
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleControlAutomation('pause')}
              disabled={isProcessing}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {processingAction === 'pause' ? 'Pausing...' : 'Pause'}
            </button>
            <button
              onClick={() => handleControlAutomation('stop')}
              disabled={isProcessing}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              {processingAction === 'stop' ? 'Stopping...' : 'Stop'}
            </button>
          </div>
        )
      case 'PAUSED':
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleControlAutomation('resume')}
              disabled={isProcessing}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {processingAction === 'resume' ? 'Resuming...' : 'Resume'}
            </button>
            <button
              onClick={() => handleControlAutomation('stop')}
              disabled={isProcessing}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              {processingAction === 'stop' ? 'Stopping...' : 'Stop'}
            </button>
          </div>
        )
      case 'STOPPED':
        return (
          <span className="text-sm text-gray-500">Automation stopped</span>
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

  if (!automation) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🤖</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Automation not found</h3>
        <p className="text-gray-600 mb-4">The automation you're looking for doesn't exist or has been deleted</p>
        <Link
          href="/dashboard/automations"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          ← Back to Automations
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Link
                href="/dashboard/automations"
                className="mr-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="flex items-center">
                <span className="text-2xl mr-3">{getTriggerIcon(automation.triggerEvent)}</span>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{automation.name}</h1>
                  <div className="flex items-center gap-4 mt-1">
                    {getStatusBadge(automation.status)}
                    <span className="text-sm text-gray-500">
                      {automation.triggerEvent.replace('_', ' ').toLowerCase()}
                    </span>
                    {automation.description && (
                      <span className="text-sm text-gray-600">{automation.description}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {getActionButtons()}
            </div>
          </div>

          {/* Performance Stats */}
          {stats && (
            <div className="grid grid-cols-4 gap-6 py-4 border-t border-gray-100">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.totalEntered}</div>
                <div className="text-sm text-gray-500">Total Entered</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.currentlyActive}</div>
                <div className="text-sm text-gray-500">Currently Active</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.totalCompleted}</div>
                <div className="text-sm text-gray-500">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.totalFailed || 0}</div>
                <div className="text-sm text-gray-500">Failed</div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="border-t border-gray-100">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('builder')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'builder'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Flow Builder
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'stats'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'settings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Settings
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'builder' && (
          <AutomationFlowBuilder
            nodes={automation.nodes}
            onNodesChange={handleNodesUpdate}
            automationData={automation}
          />
        )}

        {activeTab === 'stats' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Automation Analytics</h3>
            
            {stats?.nodeStats && stats.nodeStats.length > 0 ? (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Node Performance</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Node</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Passed</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recently Passed</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Currently In Node</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {stats.nodeStats.map((nodeStat) => (
                        <tr key={nodeStat.nodeId}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {nodeStat.nodeId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {nodeStat.totalPassed}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {nodeStat.currentPassed}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {nodeStat.inNode}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No analytics data yet</h3>
                <p className="text-gray-500">
                  Start your automation to begin collecting performance data
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Automation Settings</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={automation.name}
                  onChange={(e) => setAutomation(prev => prev ? { ...prev, name: e.target.value } : null)}
                  onBlur={() => handleSaveAutomation({ name: automation.name })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={automation.description || ''}
                  onChange={(e) => setAutomation(prev => prev ? { ...prev, description: e.target.value } : null)}
                  onBlur={() => handleSaveAutomation({ description: automation.description })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    checked={automation.trackingEnabled}
                    onChange={(e) => {
                      const trackingEnabled = e.target.checked
                      setAutomation(prev => prev ? { ...prev, trackingEnabled } : null)
                      handleSaveAutomation({ trackingEnabled })
                    }}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3">
                  <label className="text-sm font-medium text-gray-700">Enable tracking</label>
                  <p className="text-sm text-gray-500">
                    Track opens, clicks, and other email engagement
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Trigger Configuration</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <span className="text-xl mr-3">{getTriggerIcon(automation.triggerEvent)}</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {automation.triggerEvent.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-gray-500">
                        Automation starts when this event occurs
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}