'use client'

import { Handle, Position } from '@xyflow/react'
import { memo } from 'react'

interface ConditionNodeProps {
  data: any
  selected?: boolean
}

function ConditionNode({ data, selected }: ConditionNodeProps) {
  const getConditionDescription = () => {
    if (!data.condition) return 'Configure condition'
    
    const { condition } = data
    
    if (condition.type === 'rules') {
      const { rules } = condition
      if (!rules || !rules.conditions || rules.conditions.length === 0) {
        return 'No rules configured'
      }
      
      const conditionCount = rules.conditions.length
      const operator = rules.operator === 'all' ? 'AND' : 'OR'
      
      if (conditionCount === 1) {
        const rule = rules.conditions[0]
        const fieldMap: Record<string, string> = {
          'email': 'Email',
          'firstName': 'First Name',
          'lastName': 'Last Name',
          'company': 'Company',
          'phone': 'Phone',
          'tags': 'Tags',
          'segments': 'Segments',
          'status': 'Status',
          'createdAt': 'Created Date',
          'lastEngagement': 'Last Activity',
          'engagementScore': 'Engagement'
        }
        
        const operatorMap: Record<string, string> = {
          'equals': '=',
          'not_equals': '≠',
          'contains': 'contains',
          'not_contains': '!contains',
          'starts_with': 'starts with',
          'ends_with': 'ends with',
          'is_empty': 'is empty',
          'is_not_empty': 'not empty',
          'includes': 'includes',
          'not_includes': '!includes',
          'greater_than': '>',
          'less_than': '<',
          'before': 'before',
          'after': 'after',
          'in_last': 'in last'
        }
        
        const field = fieldMap[rule.field] || rule.field
        const op = operatorMap[rule.operator] || rule.operator
        const value = typeof rule.value === 'object' ? 
          `${rule.value.duration} ${rule.value.unit}` : 
          String(rule.value).substring(0, 10) + (String(rule.value).length > 10 ? '...' : '')
        
        return rule.operator === 'is_empty' || rule.operator === 'is_not_empty' 
          ? `${field} ${op}`
          : `${field} ${op} ${value}`
      }
      
      return `${conditionCount} rules (${operator})`
    }
    
    if (condition.type === 'behavior') {
      const { behavior } = condition
      if (!behavior) return 'No behavior configured'
      
      const actionMap: Record<string, string> = {
        'opens_campaign': 'Opens email',
        'not_opens_campaign': "Doesn't open",
        'clicks': 'Clicks link',
        'not_clicks': "Doesn't click",
        'replies': 'Replies',
        'not_replies': "Doesn't reply",
        'bounces': 'Bounces',
        'unsubscribes': 'Unsubscribes'
      }
      
      const action = actionMap[behavior.action] || behavior.action
      const timeFrame = behavior.timeFrame 
        ? ` in ${behavior.timeFrame.duration} ${behavior.timeFrame.unit}`
        : ''
      
      return action + timeFrame
    }
    
    return 'Configure condition'
  }

  return (
    <div className={`px-4 py-3 shadow-md rounded-md bg-purple-50 border-2 min-w-[200px] ${
      selected ? 'border-blue-500' : 'border-purple-200'
    }`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      <div className="flex items-center">
        <div className="text-2xl mr-3">🔀</div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-900">
            {data.name || 'Condition'}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {getConditionDescription()}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {data.condition?.type === 'rules' ? 'Rules-based' : 'Behavior-based'}
          </div>
        </div>
      </div>

      {/* YES/NO handles */}
      <div className="flex justify-between mt-2">
        <div className="text-xs text-green-600 font-medium">YES</div>
        <div className="text-xs text-red-600 font-medium">NO</div>
      </div>
      
      <Handle type="source" position={Position.Bottom} id="yes" className="w-3 h-3" style={{ left: '25%' }} />
      <Handle type="source" position={Position.Bottom} id="no" className="w-3 h-3" style={{ left: '75%' }} />
    </div>
  )
}

export default memo(ConditionNode)