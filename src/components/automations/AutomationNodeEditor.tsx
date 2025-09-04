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
  const [templates, setTemplates] = useState<any[]>([] as any[])
  const [contacts, setContacts] = useState<any[]>([] as any[])
  const [segments, setSegments] = useState<any[]>([] as any[])

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
          // Ensure data is arrays to prevent filter errors
          setContacts(Array.isArray(contactsData) ? contactsData as any[] : [] as any[])
          setSegments(Array.isArray(segmentsData) ? segmentsData as any[] : [] as any[])
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
      {/* Template or Custom Email Toggle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Type
        </label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="emailType"
              value="custom"
              checked={!nodeData.emailTemplate?.useTemplate}
              onChange={() => handleNestedFieldChange('emailTemplate', 'useTemplate', false)}
              className="mr-2 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Custom Email</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="emailType"
              value="template"
              checked={nodeData.emailTemplate?.useTemplate === true}
              onChange={() => handleNestedFieldChange('emailTemplate', 'useTemplate', true)}
              className="mr-2 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Use Template</span>
          </label>
        </div>
      </div>

      {nodeData.emailTemplate?.useTemplate ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Template
          </label>
          <select
            value={nodeData.emailTemplate?.templateId || ''}
            onChange={(e) => handleNestedFieldChange('emailTemplate', 'templateId', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
          >
            <option value="">Choose a template...</option>
            <option value="welcome">Welcome Email</option>
            <option value="followup">Follow-up Email</option>
            <option value="promo">Promotional Email</option>
          </select>
        </div>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject Line
            </label>
            <input
              type="text"
              value={nodeData.emailTemplate?.subject || ''}
              onChange={(e) => handleNestedFieldChange('emailTemplate', 'subject', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              placeholder="Email subject"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Content
            </label>
            <textarea
              value={nodeData.emailTemplate?.content || ''}
              onChange={(e) => handleNestedFieldChange('emailTemplate', 'content', e.target.value)}
              className="w-full p-2 h-32 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              placeholder="Write your email content here..."
            />
          </div>
        </>
      )}
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            From Name
          </label>
          <input
            type="text"
            value={nodeData.email?.fromName || ''}
            onChange={(e) => handleNestedFieldChange('email', 'fromName', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
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
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
            placeholder="reply@example.com"
          />
        </div>
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

  const renderWaitEditor = () => {
    // Get current values, supporting both old and new data structures
    const getCurrentWaitValues = () => {
      if (nodeData.wait?.duration !== undefined && nodeData.wait?.unit !== undefined) {
        // New format: convert to display values
        const duration = nodeData.wait.duration || 1
        const unit = nodeData.wait.unit || 'minutes'
        return { duration, unit }
      } else if (nodeData.wait?.days !== undefined || nodeData.wait?.hours !== undefined || nodeData.wait?.minutes !== undefined) {
        // Old format: convert to new format for editing
        const days = nodeData.wait.days || 0
        const hours = nodeData.wait.hours || 0
        const minutes = nodeData.wait.minutes || 0
        
        if (days > 0) return { duration: days, unit: 'days' }
        if (hours > 0) return { duration: hours, unit: 'hours' }
        return { duration: minutes || 1, unit: 'minutes' }
      }
      return { duration: 1, unit: 'minutes' }
    }

    const { duration, unit } = getCurrentWaitValues()

    const handleWaitChange = (field: 'duration' | 'unit', value: any) => {
      const currentDuration = field === 'duration' ? value : duration
      const currentUnit = field === 'unit' ? value : unit
      
      // Convert to the old format that WaitNode expects
      const waitData = {
        mode: 'fixed',
        days: 0,
        hours: 0,
        minutes: 0
      }
      
      // Set the appropriate field based on unit
      switch (currentUnit) {
        case 'days':
          waitData.days = parseInt(currentDuration) || 0
          break
        case 'hours':
          waitData.hours = parseInt(currentDuration) || 0
          break
        case 'weeks':
          waitData.days = (parseInt(currentDuration) || 0) * 7
          break
        case 'minutes':
        default:
          waitData.minutes = parseInt(currentDuration) || 0
          break
      }
      
      handleNestedFieldChange('wait', '', waitData)
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Wait Duration
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => handleWaitChange('duration', e.target.value)}
              min="1"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Unit
            </label>
            <select
              value={unit}
              onChange={(e) => handleWaitChange('unit', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
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
  }

  const addRule = () => {
    const currentRules = nodeData.condition?.rules?.conditions || []
    const newRule = {
      id: Date.now().toString(),
      field: 'email',
      operator: 'equals',
      value: ''
    }
    
    handleNestedFieldChange('condition', 'rules', {
      ...nodeData.condition?.rules,
      operator: nodeData.condition?.rules?.operator || 'all',
      conditions: [...currentRules, newRule]
    })
  }

  const removeRule = (ruleId: string) => {
    const currentRules = nodeData.condition?.rules?.conditions || []
    const updatedRules = currentRules.filter((rule: any) => rule.id !== ruleId)
    
    handleNestedFieldChange('condition', 'rules', {
      ...nodeData.condition?.rules,
      conditions: updatedRules
    })
  }

  const updateRule = (ruleId: string, field: string, value: any) => {
    const currentRules = nodeData.condition?.rules?.conditions || []
    const updatedRules = currentRules.map((rule: any) => 
      rule.id === ruleId ? { ...rule, [field]: value } : rule
    )
    
    handleNestedFieldChange('condition', 'rules', {
      ...nodeData.condition?.rules,
      conditions: updatedRules
    })
  }

  const renderConditionEditor = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Condition Type
        </label>
        <select
          value={nodeData.condition?.type || 'rules'}
          onChange={(e) => handleNestedFieldChange('condition', 'type', e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
        >
          <option value="rules">Rules-based</option>
          <option value="behavior">Behavior-based</option>
        </select>
      </div>

      {nodeData.condition?.type === 'behavior' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Behavior Action
            </label>
            <select
              value={nodeData.condition?.behavior?.action || ''}
              onChange={(e) => handleNestedFieldChange('condition', 'behavior', { 
                ...nodeData.condition?.behavior,
                action: e.target.value 
              })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
            >
              <option value="">Select action</option>
              <option value="opens_campaign">Opens email</option>
              <option value="not_opens_campaign">Doesn't open email</option>
              <option value="clicks">Clicks link</option>
              <option value="not_clicks">Doesn't click</option>
              <option value="replies">Replies to email</option>
              <option value="not_replies">Doesn't reply</option>
              <option value="bounces">Email bounces</option>
              <option value="unsubscribes">Unsubscribes</option>
            </select>
          </div>

          {/* Email Source Selection - Only show for email-related actions */}
          {nodeData.condition?.behavior?.action && 
           (nodeData.condition.behavior.action.includes('opens') || 
            nodeData.condition.behavior.action.includes('clicks') || 
            nodeData.condition.behavior.action.includes('replies')) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Track From Email
              </label>
              <select
                value={nodeData.condition?.behavior?.emailSource || 'last_automation_email'}
                onChange={(e) => handleNestedFieldChange('condition', 'behavior', { 
                  ...nodeData.condition?.behavior,
                  emailSource: e.target.value 
                })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              >
                <option value="last_automation_email">Last email from this automation</option>
                <option value="any_automation_email">Any email from this automation</option>
                <option value="any_campaign">Any email from campaigns</option>
                <option value="any_sequence">Any email from sequences</option>
                <option value="any_email">Any email (automation, campaign, or sequence)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Choose which emails to track behavior from
              </p>
            </div>
          )}

          {/* Specific Email/Campaign Selection - Show when 'any_campaign' or 'any_sequence' is selected */}
          {nodeData.condition?.behavior?.emailSource === 'any_campaign' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specific Campaign (Optional)
              </label>
              <select
                value={nodeData.condition?.behavior?.specificCampaign || ''}
                onChange={(e) => handleNestedFieldChange('condition', 'behavior', { 
                  ...nodeData.condition?.behavior,
                  specificCampaign: e.target.value 
                })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              >
                <option value="">Any campaign</option>
                <option value="campaign-1">Welcome Campaign</option>
                <option value="campaign-2">Product Launch</option>
                <option value="campaign-3">Newsletter</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to track from any campaign
              </p>
            </div>
          )}

          {nodeData.condition?.behavior?.emailSource === 'any_sequence' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specific Sequence (Optional)
              </label>
              <select
                value={nodeData.condition?.behavior?.specificSequence || ''}
                onChange={(e) => handleNestedFieldChange('condition', 'behavior', { 
                  ...nodeData.condition?.behavior,
                  specificSequence: e.target.value 
                })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              >
                <option value="">Any sequence</option>
                <option value="sequence-1">Onboarding Sequence</option>
                <option value="sequence-2">Sales Follow-up</option>
                <option value="sequence-3">Re-engagement</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to track from any sequence
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Frame
              </label>
              <input
                type="number"
                value={nodeData.condition?.behavior?.timeFrame?.duration || 7}
                onChange={(e) => handleNestedFieldChange('condition', 'behavior', {
                  ...nodeData.condition?.behavior,
                  timeFrame: {
                    ...nodeData.condition?.behavior?.timeFrame,
                    duration: parseInt(e.target.value)
                  }
                })}
                min="1"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Unit
              </label>
              <select
                value={nodeData.condition?.behavior?.timeFrame?.unit || 'days'}
                onChange={(e) => handleNestedFieldChange('condition', 'behavior', {
                  ...nodeData.condition?.behavior,
                  timeFrame: {
                    ...nodeData.condition?.behavior?.timeFrame,
                    unit: e.target.value
                  }
                })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              >
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {nodeData.condition?.type === 'rules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Rules Configuration
            </label>
            <select
              value={nodeData.condition?.rules?.operator || 'all'}
              onChange={(e) => handleNestedFieldChange('condition', 'rules', { 
                ...nodeData.condition?.rules,
                operator: e.target.value 
              })}
              className="text-xs border border-gray-300 rounded px-3 py-1 bg-gray-50"
            >
              <option value="all">All conditions must be met (AND)</option>
              <option value="any">Any condition can be met (OR)</option>
            </select>
          </div>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {(nodeData.condition?.rules?.conditions || []).map((rule: any, index: number) => (
              <div key={rule.id} className="p-3 border border-gray-200 rounded-md bg-gray-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">Rule {index + 1}</span>
                  <button
                    onClick={() => removeRule(rule.id)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    Remove
                  </button>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Field
                    </label>
                    <select
                      value={rule.field || 'email'}
                      onChange={(e) => updateRule(rule.id, 'field', e.target.value)}
                      className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                    >
                      <option value="email">Email</option>
                      <option value="firstName">First Name</option>
                      <option value="lastName">Last Name</option>
                      <option value="company">Company</option>
                      <option value="phone">Phone</option>
                      <option value="tags">Tags</option>
                      <option value="segments">Segments</option>
                      <option value="status">Status</option>
                      <option value="createdAt">Created Date</option>
                      <option value="lastEngagement">Last Engagement</option>
                      <option value="engagementScore">Engagement Score</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Operator
                    </label>
                    <select
                      value={rule.operator || 'equals'}
                      onChange={(e) => updateRule(rule.id, 'operator', e.target.value)}
                      className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                    >
                      {rule.field === 'email' || rule.field === 'firstName' || rule.field === 'lastName' || rule.field === 'company' || rule.field === 'phone' ? (
                        <>
                          <option value="equals">Equals</option>
                          <option value="not_equals">Not equals</option>
                          <option value="contains">Contains</option>
                          <option value="not_contains">Doesn't contain</option>
                          <option value="starts_with">Starts with</option>
                          <option value="ends_with">Ends with</option>
                          <option value="is_empty">Is empty</option>
                          <option value="is_not_empty">Is not empty</option>
                        </>
                      ) : rule.field === 'tags' || rule.field === 'segments' ? (
                        <>
                          <option value="includes">Includes</option>
                          <option value="not_includes">Doesn't include</option>
                          <option value="includes_any">Includes any of</option>
                          <option value="includes_all">Includes all of</option>
                          <option value="is_empty">Is empty</option>
                        </>
                      ) : rule.field === 'status' ? (
                        <>
                          <option value="equals">Is</option>
                          <option value="not_equals">Is not</option>
                        </>
                      ) : rule.field === 'engagementScore' ? (
                        <>
                          <option value="equals">Equals</option>
                          <option value="greater_than">Greater than</option>
                          <option value="less_than">Less than</option>
                          <option value="greater_than_or_equal">Greater than or equal</option>
                          <option value="less_than_or_equal">Less than or equal</option>
                        </>
                      ) : (
                        <>
                          <option value="equals">On date</option>
                          <option value="before">Before date</option>
                          <option value="after">After date</option>
                          <option value="between">Between dates</option>
                          <option value="in_last">In last</option>
                          <option value="not_in_last">Not in last</option>
                        </>
                      )}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Value
                    </label>
                    {rule.field === 'status' ? (
                      <select
                        value={rule.value || ''}
                        onChange={(e) => updateRule(rule.id, 'value', e.target.value)}
                        className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                      >
                        <option value="">Select status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="UNSUBSCRIBED">Unsubscribed</option>
                        <option value="BOUNCED">Bounced</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    ) : rule.field === 'engagementScore' ? (
                      <input
                        type="number"
                        value={rule.value || 0}
                        onChange={(e) => updateRule(rule.id, 'value', parseInt(e.target.value))}
                        min="0"
                        max="100"
                        className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                        placeholder="0-100"
                      />
                    ) : rule.field === 'createdAt' || rule.field === 'lastEngagement' ? (
                      rule.operator === 'in_last' || rule.operator === 'not_in_last' ? (
                        <div className="flex space-x-1">
                          <input
                            type="number"
                            value={rule.value?.duration || 7}
                            onChange={(e) => updateRule(rule.id, 'value', { 
                              ...rule.value,
                              duration: parseInt(e.target.value)
                            })}
                            min="1"
                            className="w-1/2 text-xs p-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                          />
                          <select
                            value={rule.value?.unit || 'days'}
                            onChange={(e) => updateRule(rule.id, 'value', {
                              ...rule.value,
                              unit: e.target.value
                            })}
                            className="w-1/2 text-xs p-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                          >
                            <option value="days">days</option>
                            <option value="weeks">weeks</option>
                            <option value="months">months</option>
                          </select>
                        </div>
                      ) : (
                        <input
                          type="date"
                          value={rule.value || ''}
                          onChange={(e) => updateRule(rule.id, 'value', e.target.value)}
                          className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                        />
                      )
                    ) : rule.operator !== 'is_empty' && rule.operator !== 'is_not_empty' ? (
                      <input
                        type="text"
                        value={rule.value || ''}
                        onChange={(e) => updateRule(rule.id, 'value', e.target.value)}
                        className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                        placeholder={
                          rule.field === 'tags' || rule.field === 'segments' 
                            ? 'comma,separated,values' 
                            : 'Enter value'
                        }
                      />
                    ) : (
                      <div className="text-xs text-gray-500 p-2 bg-gray-100 rounded">
                        No value needed
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <button
            onClick={addRule}
            className="w-full py-2 px-3 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            + Add Rule
          </button>
          
          {(nodeData.condition?.rules?.conditions || []).length === 0 && (
            <div className="text-sm text-gray-500 text-center py-6 border-2 border-dashed border-gray-300 rounded-md">
              No rules configured. Click "Add Rule" to get started.
            </div>
          )}
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
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
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
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
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
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
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
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
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
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
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
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
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
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
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
            className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
          />
          <select
            value={nodeData.until?.maxWait?.unit || 'days'}
            onChange={(e) => handleNestedFieldChange('until', 'maxWait', { 
              ...nodeData.until?.maxWait,
              unit: e.target.value 
            })}
            className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
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
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
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
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
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
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
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

  const renderTemplateEditor = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Template Name
        </label>
        <input
          type="text"
          value={nodeData.template?.name || ''}
          onChange={(e) => handleNestedFieldChange('template', 'name', e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
          placeholder="My Email Template"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Subject Line
        </label>
        <input
          type="text"
          value={nodeData.template?.subject || ''}
          onChange={(e) => handleNestedFieldChange('template', 'subject', e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
          placeholder="Email subject..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Template Content
        </label>
        <textarea
          value={nodeData.template?.content || ''}
          onChange={(e) => handleNestedFieldChange('template', 'content', e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
          rows={8}
          placeholder="Write your email template here. You can use variables like {{firstName}}, {{company}}, etc."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Variables
        </label>
        <div className="space-y-2">
          {(nodeData.template?.variables || []).map((variable: any, index: number) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
                value={variable.name || ''}
                onChange={(e) => {
                  const updatedVars = [...(nodeData.template?.variables || [])]
                  updatedVars[index] = { ...variable, name: e.target.value }
                  handleNestedFieldChange('template', 'variables', updatedVars)
                }}
                className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                placeholder="Variable name (e.g., firstName)"
              />
              <input
                type="text"
                value={variable.defaultValue || ''}
                onChange={(e) => {
                  const updatedVars = [...(nodeData.template?.variables || [])]
                  updatedVars[index] = { ...variable, defaultValue: e.target.value }
                  handleNestedFieldChange('template', 'variables', updatedVars)
                }}
                className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                placeholder="Default value"
              />
              <button
                onClick={() => {
                  const updatedVars = (nodeData.template?.variables || []).filter((_: any, i: number) => i !== index)
                  handleNestedFieldChange('template', 'variables', updatedVars)
                }}
                className="p-2 text-red-600 hover:bg-red-50 rounded-md"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          
          <button
            onClick={() => {
              const updatedVars = [...(nodeData.template?.variables || []), { name: '', defaultValue: '' }]
              handleNestedFieldChange('template', 'variables', updatedVars)
            }}
            className="w-full py-2 px-3 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
          >
            + Add Variable
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> Use double curly braces like {`{{firstName}}`} or {`{{company}}`} in your template content to insert variables.
        </p>
      </div>
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
      moveTo: 'Move To Settings',
      template: 'Template Settings'
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
      case 'template':
        return renderTemplateEditor()
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
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
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