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
      
      return `${conditionCount} rule${conditionCount > 1 ? 's' : ''} (${operator})`
    }
    
    if (condition.type === 'behavior') {
      const { behavior } = condition
      if (!behavior) return 'No behavior configured'
      
      const actionMap: Record<string, string> = {
        'opens_campaign': 'Opens email',
        'not_opens_campaign': "Doesn't open email",
        'clicks': 'Clicks link',
        'not_clicks': "Doesn't click"
      }
      
      return actionMap[behavior.action] || behavior.action
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