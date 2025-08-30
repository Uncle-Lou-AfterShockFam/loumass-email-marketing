'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'

interface SequenceStep {
  id: string
  type: 'email' | 'delay' | 'condition'
  subject?: string
  content?: string
  delay?: { days: number; hours: number }
  condition?: {
    type: 'opened' | 'clicked' | 'replied' | 'not_opened' | 'not_clicked'
    referenceStep: string
    trueBranch: string[]
    falseBranch: string[]
  }
  replyToThread: boolean
  trackingEnabled: boolean
  position: { x: number; y: number }
  nextStepId?: string
}

interface SequenceBuilderProps {
  userId: string
}

export default function SequenceBuilder({ userId }: SequenceBuilderProps) {
  const router = useRouter()
  const [sequenceName, setSequenceName] = useState('')
  const [description, setDescription] = useState('')
  const [triggerType, setTriggerType] = useState<'MANUAL' | 'ON_SIGNUP' | 'ON_EVENT'>('MANUAL')
  const [trackingEnabled, setTrackingEnabled] = useState(true)
  const [steps, setSteps] = useState<SequenceStep[]>([])
  const [selectedStep, setSelectedStep] = useState<SequenceStep | null>(null)
  const [isTestMode, setIsTestMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const addStep = (type: SequenceStep['type']) => {
    const newStep: SequenceStep = {
      id: uuidv4(),
      type,
      replyToThread: false,
      trackingEnabled: trackingEnabled,
      position: { 
        x: 100 + (steps.length % 3) * 250, 
        y: 100 + Math.floor(steps.length / 3) * 200 
      }
    }

    if (type === 'email') {
      newStep.subject = ''
      newStep.content = ''
    } else if (type === 'delay') {
      newStep.delay = { days: 1, hours: 0 }
    } else if (type === 'condition') {
      newStep.condition = {
        type: 'opened',
        referenceStep: '',
        trueBranch: [],
        falseBranch: []
      }
    }

    setSteps([...steps, newStep])
    setSelectedStep(newStep)
  }

  const updateStep = (stepId: string, updates: Partial<SequenceStep>) => {
    setSteps(steps.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ))
    if (selectedStep?.id === stepId) {
      setSelectedStep({ ...selectedStep, ...updates })
    }
  }

  const deleteStep = (stepId: string) => {
    setSteps(steps.filter(step => step.id !== stepId))
    if (selectedStep?.id === stepId) {
      setSelectedStep(null)
    }
  }

  const connectSteps = (fromId: string, toId: string) => {
    setSteps(steps.map(step => 
      step.id === fromId ? { ...step, nextStepId: toId } : step
    ))
  }

  const testSequence = () => {
    setIsTestMode(true)
    // Simulate sequence flow
    setTimeout(() => {
      setIsTestMode(false)
      alert('Sequence test completed! Check the flow to see the simulated path.')
    }, 3000)
  }

  const saveSequence = async () => {
    if (!sequenceName) {
      alert('Please enter a sequence name')
      return
    }

    if (steps.length === 0) {
      alert('Please add at least one step to the sequence')
      return
    }

    setIsSaving(true)
    
    try {
      const response = await fetch('/api/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sequenceName,
          description,
          triggerType,
          trackingEnabled,
          steps: steps,
          status: 'ACTIVE'
        })
      })

      if (response.ok) {
        const { id } = await response.json()
        router.push(`/dashboard/sequences/${id}`)
      } else {
        throw new Error('Failed to save sequence')
      }
    } catch (error) {
      alert('Failed to save sequence. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const getStepIcon = (type: SequenceStep['type']) => {
    switch (type) {
      case 'email':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )
      case 'delay':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'condition':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Sequence Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sequence Settings</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sequence Name *
            </label>
            <input
              type="text"
              value={sequenceName}
              onChange={(e) => setSequenceName(e.target.value)}
              placeholder="e.g., Welcome Series"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trigger Type
            </label>
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value as typeof triggerType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="MANUAL">Manual Enrollment</option>
              <option value="ON_SIGNUP">On Contact Signup</option>
              <option value="ON_EVENT">On Custom Event</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this sequence does..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={trackingEnabled}
                onChange={(e) => setTrackingEnabled(e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">
                Enable open and click tracking for this sequence
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Step Builder Toolbar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => addStep('email')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              {getStepIcon('email')}
              Add Email
            </button>
            <button
              onClick={() => addStep('delay')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              {getStepIcon('delay')}
              Add Delay
            </button>
            <button
              onClick={() => addStep('condition')}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
            >
              {getStepIcon('condition')}
              Add Condition
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={testSequence}
              disabled={steps.length === 0 || isTestMode}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              {isTestMode ? 'Testing...' : 'Test Sequence'}
            </button>
          </div>
        </div>
      </div>

      {/* Visual Flow Builder */}
      <div className="bg-white rounded-lg shadow" style={{ minHeight: '500px' }}>
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="text-lg font-medium text-gray-900">Sequence Flow</h3>
        </div>
        
        {steps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-gray-500">
            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <p className="text-lg font-medium">Start building your sequence</p>
            <p className="text-sm mt-1">Add your first email, delay, or condition above</p>
          </div>
        ) : (
          <div className="p-6 relative" style={{ minHeight: '400px' }}>
            {/* Step Cards */}
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`absolute bg-white border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedStep?.id === step.id 
                    ? 'border-blue-500 shadow-lg' 
                    : 'border-gray-200 hover:border-gray-300 hover:shadow'
                } ${isTestMode ? 'animate-pulse' : ''}`}
                style={{ 
                  left: `${step.position.x}px`, 
                  top: `${step.position.y}px`,
                  width: '200px'
                }}
                onClick={() => setSelectedStep(step)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`${
                    step.type === 'email' ? 'text-blue-600' :
                    step.type === 'delay' ? 'text-purple-600' :
                    'text-orange-600'
                  }`}>
                    {getStepIcon(step.type)}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteStep(step.id)
                    }}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="text-sm">
                  <p className="font-medium text-gray-900">
                    {step.type === 'email' && (step.subject || 'Email Step')}
                    {step.type === 'delay' && `Wait ${step.delay?.days || 0}d ${step.delay?.hours || 0}h`}
                    {step.type === 'condition' && `If ${step.condition?.type || 'condition'}`}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Step {index + 1}
                    {step.replyToThread && ' • In Thread'}
                    {step.trackingEnabled && ' • Tracking On'}
                  </p>
                </div>
              </div>
            ))}

            {/* Connection Lines */}
            <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
              {steps.map((step, index) => {
                if (index < steps.length - 1) {
                  const nextStep = steps[index + 1]
                  return (
                    <line
                      key={`${step.id}-${nextStep.id}`}
                      x1={step.position.x + 100}
                      y1={step.position.y + 40}
                      x2={nextStep.position.x + 100}
                      y2={nextStep.position.y + 40}
                      stroke="#e5e7eb"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                    />
                  )
                }
                return null
              })}
            </svg>
          </div>
        )}
      </div>

      {/* Step Editor Panel */}
      {selectedStep && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Edit {selectedStep.type === 'email' ? 'Email' : 
                     selectedStep.type === 'delay' ? 'Delay' : 'Condition'} Step
            </h3>
            <button
              onClick={() => setSelectedStep(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {selectedStep.type === 'email' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={selectedStep.subject || ''}
                  onChange={(e) => updateStep(selectedStep.id, { subject: e.target.value })}
                  placeholder="Enter email subject..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Content
                </label>
                <textarea
                  value={selectedStep.content || ''}
                  onChange={(e) => updateStep(selectedStep.id, { content: e.target.value })}
                  placeholder="Write your email content... Use {{firstName}}, {{lastName}}, {{company}} for personalization"
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedStep.replyToThread}
                    onChange={(e) => updateStep(selectedStep.id, { replyToThread: e.target.checked })}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Reply in existing thread</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedStep.trackingEnabled}
                    onChange={(e) => updateStep(selectedStep.id, { trackingEnabled: e.target.checked })}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Enable tracking for this email</span>
                </label>
              </div>
            </div>
          )}

          {selectedStep.type === 'delay' && (
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Days
                </label>
                <input
                  type="number"
                  min="0"
                  value={selectedStep.delay?.days || 0}
                  onChange={(e) => updateStep(selectedStep.id, { 
                    delay: { 
                      ...selectedStep.delay, 
                      days: parseInt(e.target.value) || 0 
                    } 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hours
                </label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={selectedStep.delay?.hours || 0}
                  onChange={(e) => updateStep(selectedStep.id, { 
                    delay: { 
                      ...selectedStep.delay, 
                      hours: parseInt(e.target.value) || 0 
                    } 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {selectedStep.type === 'condition' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condition Type
                </label>
                <select
                  value={selectedStep.condition?.type || 'opened'}
                  onChange={(e) => updateStep(selectedStep.id, {
                    condition: {
                      ...selectedStep.condition!,
                      type: e.target.value as any
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="opened">If email was opened</option>
                  <option value="not_opened">If email was NOT opened</option>
                  <option value="clicked">If link was clicked</option>
                  <option value="not_clicked">If link was NOT clicked</option>
                  <option value="replied">If recipient replied</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference Step
                </label>
                <select
                  value={selectedStep.condition?.referenceStep || ''}
                  onChange={(e) => updateStep(selectedStep.id, {
                    condition: {
                      ...selectedStep.condition!,
                      referenceStep: e.target.value
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Select a previous email step...</option>
                  {steps
                    .filter(s => s.type === 'email' && s.id !== selectedStep.id)
                    .map(s => (
                      <option key={s.id} value={s.id}>
                        {s.subject || 'Email Step'}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-green-700 mb-1">
                    True Branch (condition met)
                  </label>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">Continue to next step →</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-red-700 mb-1">
                    False Branch (condition not met)
                  </label>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">Skip or alternate path →</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={() => router.push('/dashboard/sequences')}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
        >
          Cancel
        </button>

        <div className="flex gap-3">
          <button
            onClick={() => alert('Preview mode coming soon!')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            Preview
          </button>
          <button
            onClick={saveSequence}
            disabled={isSaving || !sequenceName || steps.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save & Activate'}
          </button>
        </div>
      </div>
    </div>
  )
}