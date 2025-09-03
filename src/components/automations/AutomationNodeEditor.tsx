'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface AutomationNodeEditorProps {
  node: any
  isOpen: boolean
  onClose: () => void
  onSave: (nodeData: any) => void
}

export default function AutomationNodeEditor({ node, isOpen, onClose, onSave }: AutomationNodeEditorProps) {
  const [nodeData, setNodeData] = useState(node?.data || {})
  const [templates, setTemplates] = useState([])
  const [contacts, setContacts] = useState([])
  const [segments, setSegments] = useState([])

  useEffect(() => {
    if (node) {
      setNodeData(node.data || {})
    }
  }, [node])

  // Fetch templates, contacts, and segments when needed
  useEffect(() => {
    if (isOpen && (node?.type === 'email' || node?.type === 'moveTo')) {
      // Fetch templates for email nodes
      if (node?.type === 'email') {
        fetch('/api/templates')
          .then(res => res.json())
          .then(data => setTemplates(data))
          .catch(console.error)
      }
      
      // Fetch segments and contacts for condition and moveTo nodes
      if (node?.type === 'moveTo' || node?.type === 'condition') {
        Promise.all([
          fetch('/api/contacts').then(res => res.json()),
          fetch('/api/segments').then(res => res.json())
        ]).then(([contactsData, segmentsData]) => {
          setContacts(contactsData)
          setSegments(segmentsData)
        }).catch(console.error)
      }
    }
  }, [isOpen, node?.type])

  const handleSave = () => {
    onSave(nodeData)
    onClose()
  }

  const handleFieldChange = (field: string, value: any) => {
    setNodeData((prev: any) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleNestedFieldChange = (section: string, field: string, value: any) => {
    setNodeData((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
  }

  if (!isOpen || !node) return null

  const renderEmailEditor = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Template
        </label>
        <select
          value={nodeData.email?.templateId || ''}
          onChange={(e) => handleNestedFieldChange('email', 'templateId', e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select a template</option>
          {templates.map((template: any) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            From Name
          </label>
          <input
            type="text"
            value={nodeData.email?.fromName || ''}
            onChange={(e) => handleNestedFieldChange('email', 'fromName', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Your Name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reply To
          </label>
          <input
            type="email"
            value={nodeData.email?.replyTo || ''}
            onChange={(e) => handleNestedFieldChange('email', 'replyTo', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="reply@example.com"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Subject Line
        </label>
        <input
          type="text"
          value={nodeData.email?.subject || ''}
          onChange={(e) => handleNestedFieldChange('email', 'subject', e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="Email subject"
        />
      </div>
      
      <div className="flex items-center space-x-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={nodeData.email?.trackingEnabled || false}
            onChange={(e) => handleNestedFieldChange('email', 'trackingEnabled', e.target.checked)}
            className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Enable tracking</span>
        </label>
        
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={nodeData.email?.replyToThread || false}
            onChange={(e) => handleNestedFieldChange('email', 'replyToThread', e.target.checked)}
            className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Reply to thread</span>
        </label>
      </div>
    </div>
  )

  const renderWaitEditor = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Wait Duration
          </label>
          <input
            type="number"
            value={nodeData.wait?.duration || 1}
            onChange={(e) => handleNestedFieldChange('wait', 'duration', parseInt(e.target.value))}
            min="1"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time Unit
          </label>
          <select
            value={nodeData.wait?.unit || 'days'}
            onChange={(e) => handleNestedFieldChange('wait', 'unit', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
            <option value="weeks">Weeks</option>
          </select>
        </div>
      </div>
    </div>
  )

  const renderConditionEditor = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Condition Type
        </label>
        <select
          value={nodeData.condition?.type || 'rules'}
          onChange={(e) => handleNestedFieldChange('condition', 'type', e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="rules">Rules-based</option>
          <option value="behavior">Behavior-based</option>
        </select>
      </div>

      {nodeData.condition?.type === 'behavior' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Behavior Action
          </label>
          <select
            value={nodeData.condition?.behavior?.action || ''}
            onChange={(e) => handleNestedFieldChange('condition', 'behavior', { action: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select action</option>
            <option value="opens_campaign">Opens email</option>
            <option value="not_opens_campaign">Doesn't open email</option>
            <option value="clicks">Clicks link</option>
            <option value="not_clicks">Doesn't click</option>
          </select>
        </div>
      )}

      {nodeData.condition?.type === 'rules' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Rules
            </label>
            <select
              value={nodeData.condition?.rules?.operator || 'all'}
              onChange={(e) => handleNestedFieldChange('condition', 'rules', { 
                ...nodeData.condition?.rules,
                operator: e.target.value 
              })}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="all">All (AND)</option>
              <option value="any">Any (OR)</option>
            </select>
          </div>
          
          <div className="text-sm text-gray-500">
            Rules configuration would go here (contact fields, segments, etc.)
          </div>
        </div>
      )}
    </div>
  )

  const renderWebhookEditor = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Webhook URL
        </label>
        <input
          type="url"
          value={nodeData.webhook?.url || ''}
          onChange={(e) => handleNestedFieldChange('webhook', 'url', e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="https://your-webhook-url.com"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          HTTP Method
        </label>
        <select
          value={nodeData.webhook?.method || 'POST'}
          onChange={(e) => handleNestedFieldChange('webhook', 'method', e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Headers (JSON format)
        </label>
        <textarea
          value={nodeData.webhook?.headers ? JSON.stringify(nodeData.webhook.headers, null, 2) : '{}'}
          onChange={(e) => {
            try {
              const headers = JSON.parse(e.target.value)
              handleNestedFieldChange('webhook', 'headers', headers)
            } catch {
              // Invalid JSON, ignore
            }
          }}
          rows={3}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder='{"Content-Type": "application/json"}'
        />
      </div>
    </div>
  )

  const renderSMSEditor = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sender
        </label>
        <input
          type="text"
          value={nodeData.sms?.sender || ''}
          onChange={(e) => handleNestedFieldChange('sms', 'sender', e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="Your Business Name"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Message
        </label>
        <textarea
          value={nodeData.sms?.message || ''}
          onChange={(e) => handleNestedFieldChange('sms', 'message', e.target.value)}
          rows={4}
          maxLength={160}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="Your SMS message..."
        />
        <div className="text-xs text-gray-500 text-right">
          {nodeData.sms?.message?.length || 0}/160 characters
        </div>
      </div>
    </div>
  )

  const renderUntilEditor = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Wait Until Type
        </label>
        <select
          value={nodeData.until?.type || 'behavior'}
          onChange={(e) => handleNestedFieldChange('until', 'type', e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="behavior">Behavior-based</option>
          <option value="rules">Rules-based</option>
        </select>
      </div>

      {nodeData.until?.type === 'behavior' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Behavior Action
          </label>
          <select
            value={nodeData.until?.behavior?.action || ''}
            onChange={(e) => handleNestedFieldChange('until', 'behavior', { action: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select action</option>
            <option value="opens_campaign">Opens email</option>
            <option value="clicks">Clicks link</option>
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Maximum Wait Time
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={nodeData.until?.maxWait?.duration || 7}
            onChange={(e) => handleNestedFieldChange('until', 'maxWait', { 
              ...nodeData.until?.maxWait,
              duration: parseInt(e.target.value) 
            })}
            min="1"
            className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
          <select
            value={nodeData.until?.maxWait?.unit || 'days'}
            onChange={(e) => handleNestedFieldChange('until', 'maxWait', { 
              ...nodeData.until?.maxWait,
              unit: e.target.value 
            })}
            className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="hours">Hours</option>
            <option value="days">Days</option>
            <option value="weeks">Weeks</option>
          </select>
        </div>
      </div>
    </div>
  )

  const renderWhenEditor = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Date & Time
        </label>
        <input
          type="datetime-local"
          value={nodeData.when?.datetime || ''}
          onChange={(e) => handleNestedFieldChange('when', 'datetime', e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>
  )

  const renderMoveToEditor = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Move To
        </label>
        <select
          value={nodeData.moveTo?.type || 'segment'}
          onChange={(e) => handleNestedFieldChange('moveTo', 'type', e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="segment">Segment</option>
          <option value="list">List</option>
        </select>
      </div>

      {nodeData.moveTo?.type === 'segment' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target Segment
          </label>
          <select
            value={nodeData.moveTo?.segmentId || ''}
            onChange={(e) => {
              const selectedSegment = segments.find((s: any) => s.id === e.target.value)
              handleNestedFieldChange('moveTo', 'segmentId', e.target.value)
              handleNestedFieldChange('moveTo', 'segmentName', (selectedSegment as any)?.name || '')
            }}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select segment</option>
            {segments.map((segment: any) => (
              <option key={segment.id} value={segment.id}>
                {segment.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )

  const getEditorTitle = () => {
    const typeMap: Record<string, string> = {
      email: 'Email Settings',
      wait: 'Wait Settings',
      condition: 'Condition Settings',
      webhook: 'Webhook Settings',
      sms: 'SMS Settings',
      until: 'Until Settings',
      when: 'When Settings',
      moveTo: 'Move To Settings'
    }
    return typeMap[node.type] || 'Node Settings'
  }

  const renderNodeEditor = () => {
    switch (node.type) {
      case 'email':
        return renderEmailEditor()
      case 'wait':
        return renderWaitEditor()
      case 'condition':
        return renderConditionEditor()
      case 'webhook':
        return renderWebhookEditor()
      case 'sms':
        return renderSMSEditor()
      case 'until':
        return renderUntilEditor()
      case 'when':
        return renderWhenEditor()
      case 'moveTo':
        return renderMoveToEditor()
      default:
        return (
          <div className="text-center text-gray-500 py-8">
            Configuration not available for this node type
          </div>
        )
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {getEditorTitle()}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Node Name
            </label>
            <input
              type="text"
              value={nodeData.name || ''}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter node name"
            />
          </div>
          
          {renderNodeEditor()}
        </div>
        
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}