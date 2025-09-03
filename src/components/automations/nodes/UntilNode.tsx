'use client'

import { Handle, Position } from '@xyflow/react'
import { memo } from 'react'

interface UntilNodeProps {
  data: any
  selected?: boolean
}

function UntilNode({ data, selected }: UntilNodeProps) {
  const getUntilDescription = () => {
    if (!data.until) return 'Configure condition'
    
    const { until } = data
    
    if (until.type === 'behavior' && until.behavior) {
      const actionMap: Record<string, string> = {
        'opens_campaign': 'Opens email',
        'clicks': 'Clicks link'
      }
      return actionMap[until.behavior.action] || until.behavior.action
    }
    
    if (until.type === 'rules' && until.rules) {
      const conditionCount = until.rules.conditions?.length || 0
      return `${conditionCount} rule${conditionCount > 1 ? 's' : ''}`
    }
    
    return 'Configure condition'
  }

  return (
    <div className={`px-4 py-3 shadow-md rounded-md bg-orange-50 border-2 min-w-[200px] ${
      selected ? 'border-blue-500' : 'border-orange-200'
    }`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      <div className="flex items-center">
        <div className="text-2xl mr-3">⏳</div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-900">
            {data.name || 'Until'}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Wait until: {getUntilDescription()}
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  )
}

export default memo(UntilNode)