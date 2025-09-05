'use client'

import React, { memo } from 'react'
import { Handle, Position } from '@xyflow/react'

interface TriggerNodeProps {
  data: {
    label?: string
    triggerType?: string
    triggerEvent?: string
  }
  selected?: boolean
}

const TriggerNode = memo(({ data, selected }: TriggerNodeProps) => {
  const triggerType = data.triggerType || data.triggerEvent || 'MANUAL'
  
  const getTriggerIcon = () => {
    switch (triggerType) {
      case 'NEW_SUBSCRIBER':
        return '👤'
      case 'SPECIFIC_DATE':
        return '📅'
      case 'SUBSCRIBER_SEGMENT':
        return '👥'
      case 'WEBHOOK':
        return '🔗'
      case 'MANUAL':
        return '▶️'
      default:
        return '🎯'
    }
  }

  const getTriggerLabel = () => {
    switch (triggerType) {
      case 'NEW_SUBSCRIBER':
        return 'New Subscriber'
      case 'SPECIFIC_DATE':
        return 'Specific Date'
      case 'SUBSCRIBER_SEGMENT':
        return 'Subscriber Segment'
      case 'WEBHOOK':
        return 'Webhook'
      case 'MANUAL':
        return 'Manual Trigger'
      default:
        return data.label || 'Automation Start'
    }
  }

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 min-w-[180px]
        ${selected 
          ? 'border-green-500 bg-green-50 shadow-lg' 
          : 'border-green-300 bg-white hover:border-green-400 hover:shadow-md'
        }
        transition-all duration-200
      `}
    >
      <div className="flex items-center gap-2">
        <div className="text-2xl">{getTriggerIcon()}</div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-900">
            {getTriggerLabel()}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            Starting Point
          </div>
        </div>
      </div>
      
      {/* Only output handle - trigger nodes don't have inputs */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 bg-green-500 border-2 border-white"
        style={{ bottom: -4 }}
      />
    </div>
  )
})

TriggerNode.displayName = 'TriggerNode'

export default TriggerNode