'use client'

import { useEffect, useState, useRef } from 'react'
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
  nodes: any[] | { nodes: any[], edges: any[] }
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
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

    // Cleanup on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
    }
  }, [session, status, router, automationId])

  // Force immediate navigation with background cleanup
  useEffect(() => {
    const handleNavigationClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const navLink = target.closest('a[href^="/dashboard"]')
      const backButton = target.closest('[class*="back"]') || target.closest('[role="button"]')
      
      // Check if the click is on a navigation element
      if (navLink || backButton) {
        console.log('Navigation detected - forcing immediate navigation')
        
        // Immediately set navigation state to bypass all save operations
        setIsNavigating(true)
        setSaving(false)
        setHasUnsavedChanges(false)
        
        // Set global navigation flag
        ;(window as any).__navigating = true
        
        // Clear any pending saves
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current)
          saveTimeoutRef.current = null
        }
        
        // For navigation links, force immediate router navigation
        if (navLink) {
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()
          
          const href = navLink.getAttribute('href')
          if (href) {
            console.log('Router push to:', href)
            
            // Force immediate navigation - don't wait for cleanup
            setTimeout(() => {
              router.push(href)
            }, 0)
            
            return false
          }
        }
        
        // For back button, navigate to automations list
        if (backButton && !navLink) {
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()
          
          console.log('Back button clicked - navigating to automations')
          setTimeout(() => {
            router.push('/dashboard/automations')
          }, 0)
          
          return false
        }
      }
    }

    // Use capture phase to intercept before any other handlers
    document.addEventListener('click', handleNavigationClick, { capture: true, passive: false })
    
    // Also handle browser back/forward buttons
    const handlePopState = () => {
      console.log('Browser navigation detected')
      setIsNavigating(true)
      setSaving(false)
      setHasUnsavedChanges(false)
      
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
    }
    
    window.addEventListener('popstate', handlePopState)
    
    // Cleanup on unmount
    return () => {
      console.log('Cleaning up navigation listeners')
      document.removeEventListener('click', handleNavigationClick, { capture: true } as any)
      window.removeEventListener('popstate', handlePopState)
      
      // Final cleanup
      setHasUnsavedChanges(false)
      setIsNavigating(false)
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [router])

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
      setIsTransitioning(true)
      
      // Clear any pending saves
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
      
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
      // Keep transitioning true for a bit to prevent immediate saves
      setTimeout(() => setIsTransitioning(false), 1000)
    }
  }

  const handleSaveAutomation = async (updatedAutomation: Partial<Automation>) => {
    // Multiple aggressive checks to prevent saves during navigation
    if (!automation || isTransitioning || isNavigating || saving) {
      console.log('Skipping save - invalid state:', { 
        hasAutomation: !!automation, 
        isTransitioning, 
        isNavigating, 
        saving 
      })
      return
    }
    
    // Don't save if we're in the middle of changing status
    if (processingAction) {
      console.log('Skipping save - processing action:', processingAction)
      return
    }

    // Don't save if we're navigating away (check if document is losing visibility)
    if (document.visibilityState === 'hidden') {
      console.log('Skipping save - document is hidden (likely navigating away)')
      return
    }

    // Additional check for page unload state
    if ((window as any).__navigating) {
      console.log('Skipping save - page is navigating')
      return
    }

    console.log('Proceeding with save:', updatedAutomation)

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
      console.log('Automation saved successfully, received:', result.automation)
      setAutomation(result.automation)
      setHasUnsavedChanges(false)
      toast.success('Automation saved successfully')
    } catch (error: any) {
      console.error('Error saving automation:', error)
      toast.error(error.message || 'Failed to save automation')
    } finally {
      setSaving(false)
    }
  }

  const handleNodesUpdate = (data: { nodes: any[], edges: any[] }) => {
    if (!automation || isTransitioning || isNavigating) return
    
    // Don't allow modifications to active automations
    if (automation.status === 'ACTIVE') {
      console.log('Cannot modify active automation - skipping auto-save')
      return
    }
    
    // Don't update if we're processing an action
    if (processingAction) return
    
    // Store both nodes and edges in the automation structure
    const flowData = {
      nodes: data.nodes,
      edges: data.edges
    }
    
    const updatedAutomation = { ...automation, nodes: flowData }
    setAutomation(updatedAutomation)
    setHasUnsavedChanges(true)
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    // Auto-save nodes after a short delay (only for non-active automations)
    saveTimeoutRef.current = setTimeout(() => {
      if (!isTransitioning && !processingAction && automation.status !== 'ACTIVE') {
        handleSaveAutomation({ nodes: flowData })
      }
    }, 1500)
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
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
              {/* Manual Save Button */}
              {automation.status !== 'ACTIVE' && (
                <div className="relative">
                  {hasUnsavedChanges && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-orange-500 rounded-full animate-pulse"></span>
                  )}
                  <button
                    onClick={() => handleSaveAutomation({ nodes: automation.nodes })}
                    disabled={saving || !!processingAction}
                    className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                      hasUnsavedChanges 
                        ? 'border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100' 
                        : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                    }`}
                  >
                    {saving ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : hasUnsavedChanges ? (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V2" />
                        </svg>
                        Save Changes
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        All Saved
                      </>
                    )}
                  </button>
                </div>
              )}
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
      <div>
        {activeTab === 'builder' && (
          <AutomationFlowBuilder
            nodes={Array.isArray(automation.nodes) ? automation.nodes : automation.nodes?.nodes || []}
            edges={Array.isArray(automation.nodes) ? [] : automation.nodes?.edges || []}
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
                  onBlur={() => {
                    // Only save if we're not navigating away
                    if (!isNavigating) {
                      handleSaveAutomation({ name: automation.name })
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={automation.description || ''}
                  onChange={(e) => setAutomation(prev => prev ? { ...prev, description: e.target.value } : null)}
                  onBlur={() => {
                    // Only save if we're not navigating away
                    if (!isNavigating) {
                      handleSaveAutomation({ description: automation.description })
                    }
                  }}
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