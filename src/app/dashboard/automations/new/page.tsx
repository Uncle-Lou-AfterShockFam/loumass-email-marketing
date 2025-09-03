'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import AutomationFlowBuilder from '@/components/automations/AutomationFlowBuilder'
import AutomationSettings from '@/components/automations/AutomationSettings'

interface AutomationNode {
  id: string
  type: 'wait' | 'email' | 'sms' | 'condition' | 'until' | 'webhook' | 'when' | 'move_to'
  name?: string
  position: { x: number; y: number }
  // Node-specific data
  emailTemplate?: {
    subject: string
    content: string
    trackingEnabled?: boolean
    utmTracking?: boolean
    subdomain?: string
  }
  wait?: {
    mode: 'fixed' | 'variable'
    days?: number
    hours?: number
    minutes?: number
    waitUntil?: {
      type: 'day_of_month' | 'day_of_week'
      value: number | string
      time?: string
    }
  }
  sms?: {
    sender: string
    message: string
    customTags?: boolean
  }
  condition?: {
    type: 'rules' | 'behavior'
    rules?: {
      operator: 'all' | 'any'
      conditions: Array<{
        field: string
        operator: string
        value: string
      }>
    }
    behavior?: {
      action: string
      campaignRef?: string
    }
    yesBranch: string[]
    noBranch: string[]
  }
  until?: {
    type: 'rules' | 'behavior'
    rules?: {
      operator: 'all' | 'any'
      conditions: Array<{
        field: string
        operator: string
        value: string
      }>
    }
    behavior?: {
      action: string
      campaignRef?: string
    }
  }
  webhook?: {
    method: 'GET' | 'POST'
    url: string
    body?: Record<string, string>
  }
  when?: {
    datetime: string
  }
  moveTo?: {
    targetNodeId: string
  }
  nextNodes?: string[]
}

interface AutomationData {
  name: string
  description: string
  triggerEvent: 'NEW_SUBSCRIBER' | 'SPECIFIC_DATE' | 'SUBSCRIBER_SEGMENT' | 'WEBHOOK' | 'MANUAL'
  triggerData?: {
    listId?: string
    segmentId?: string
    specificDate?: string
    webhookUrl?: string
  }
  applyToExisting: boolean
  trackingEnabled: boolean
  nodes: AutomationNode[] | { nodes: AutomationNode[], edges: any[] }
}

export default function NewAutomationPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [currentStep, setCurrentStep] = useState<'settings' | 'builder'>('settings')
  
  const [automationData, setAutomationData] = useState<AutomationData>({
    name: '',
    description: '',
    triggerEvent: 'NEW_SUBSCRIBER',
    triggerData: {},
    applyToExisting: false,
    trackingEnabled: true,
    nodes: { nodes: [], edges: [] }
  })

  const handleSettingsComplete = (settings: Partial<AutomationData>) => {
    setAutomationData(prev => ({ ...prev, ...settings }))
    setCurrentStep('builder')
  }

  const handleNodesUpdate = (data: { nodes: any[], edges: any[] }) => {
    setAutomationData(prev => ({ ...prev, nodes: data }))
  }

  const handleSave = async (status: 'DRAFT' | 'ACTIVE' = 'DRAFT') => {
    if (!session?.user?.id) {
      toast.error('You must be logged in to save automations')
      return
    }

    if (!automationData.name.trim()) {
      toast.error('Automation name is required')
      return
    }

    const nodesList = Array.isArray(automationData.nodes) ? automationData.nodes : automationData.nodes?.nodes || []
    if (nodesList.length === 0) {
      toast.error('Please add at least one node to your automation')
      return
    }

    const emailNodes = nodesList.filter((n: any) => n.type === 'email')
    if (emailNodes.length === 0) {
      toast.error('Automation must contain at least one email node')
      return
    }

    try {
      setSaving(true)
      
      const response = await fetch('/api/automations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...automationData,
          status
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save automation')
      }

      const result = await response.json()
      
      if (status === 'ACTIVE') {
        toast.success('Automation created and started successfully!')
      } else {
        toast.success('Automation saved as draft')
      }
      
      router.push(`/dashboard/automations/${result.automation.id}`)
    } catch (error: any) {
      console.error('Error saving automation:', error)
      toast.error(error.message || 'Failed to save automation')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Create New Automation</h1>
                <div className="flex items-center mt-1">
                  <span className={`text-sm ${currentStep === 'settings' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                    1. Settings
                  </span>
                  <svg className="w-4 h-4 mx-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className={`text-sm ${currentStep === 'builder' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                    2. Flow Builder
                  </span>
                </div>
              </div>
            </div>
            
            {currentStep === 'builder' && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleSave('DRAFT')}
                  disabled={saving}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save as Draft'}
                </button>
                <button
                  onClick={() => handleSave('ACTIVE')}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create & Start'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentStep === 'settings' ? (
          <AutomationSettings
            initialData={automationData}
            onComplete={handleSettingsComplete}
          />
        ) : (
          <AutomationFlowBuilder
            nodes={Array.isArray(automationData.nodes) ? automationData.nodes : automationData.nodes?.nodes || []}
            edges={Array.isArray(automationData.nodes) ? [] : automationData.nodes?.edges || []}
            onNodesChange={handleNodesUpdate}
            automationData={automationData}
          />
        )}
      </div>
    </div>
  )
}