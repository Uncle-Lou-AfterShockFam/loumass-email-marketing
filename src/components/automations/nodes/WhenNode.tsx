'use client'

import { Handle, Position } from '@xyflow/react'
import { memo } from 'react'

interface WhenNodeProps {
  data: any
  selected?: boolean
}

function WhenNode({ data, selected }: WhenNodeProps) {
  const getWhenDescription = () => {
    if (!data.when?.datetime) return 'Configure date/time'
    
    const date = new Date(data.when.datetime)
    return date.toLocaleString()
  }

  return (
    <div className={`px-4 py-3 shadow-md rounded-md bg-indigo-50 border-2 min-w-[200px] ${
      selected ? 'border-blue-500' : 'border-indigo-200'
    }`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      <div className="flex items-center">
        <div className="text-2xl mr-3">📅</div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-900">
            {data.name || 'When'}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {getWhenDescription()}
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  )
}

export default memo(WhenNode)