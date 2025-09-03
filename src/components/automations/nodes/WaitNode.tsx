'use client'

import { Handle, Position } from '@xyflow/react'
import { memo } from 'react'

interface WaitNodeProps {
  data: any
  selected?: boolean
}

function WaitNode({ data, selected }: WaitNodeProps) {
  const getWaitDescription = () => {
    if (!data.wait) return 'Configure wait time'
    
    if (data.wait.mode === 'variable') {
      const { waitUntil } = data.wait
      if (waitUntil?.type === 'day_of_week') {
        return `Until next ${waitUntil.value}${waitUntil.time ? ` at ${waitUntil.time}` : ''}`
      }
      if (waitUntil?.type === 'day_of_month') {
        return `Until ${waitUntil.value}${waitUntil.time ? ` at ${waitUntil.time}` : ''}`
      }
    }
    
    // Fixed mode
    const { days = 0, hours = 0, minutes = 0 } = data.wait
    const parts = []
    if (days > 0) parts.push(`${days}d`)
    if (hours > 0) parts.push(`${hours}h`)
    if (minutes > 0) parts.push(`${minutes}m`)
    
    return parts.length > 0 ? parts.join(' ') : 'Instant'
  }

  return (
    <div className={`px-4 py-3 shadow-md rounded-md bg-yellow-50 border-2 min-w-[200px] ${
      selected ? 'border-blue-500' : 'border-yellow-200'
    }`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      <div className="flex items-center">
        <div className="text-2xl mr-3">⏱️</div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-900">
            {data.name || 'Wait'}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {getWaitDescription()}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {data.wait?.mode === 'fixed' ? 'Fixed time' : 'Variable time'}
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  )
}

export default memo(WaitNode)