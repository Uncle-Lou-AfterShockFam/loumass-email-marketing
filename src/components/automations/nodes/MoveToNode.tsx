'use client'

import { Handle, Position } from '@xyflow/react'
import { memo } from 'react'

interface MoveToNodeProps {
  data: any
  selected?: boolean
}

function MoveToNode({ data, selected }: MoveToNodeProps) {
  const getMoveToDescription = () => {
    if (!data.moveTo?.segmentId && !data.moveTo?.listId) return 'Configure destination'
    
    if (data.moveTo.segmentId) {
      return `To segment: ${data.moveTo.segmentName || 'Unnamed segment'}`
    }
    
    if (data.moveTo.listId) {
      return `To list: ${data.moveTo.listName || 'Unnamed list'}`
    }
    
    return 'Configure destination'
  }

  return (
    <div className={`px-4 py-3 shadow-md rounded-md bg-teal-50 border-2 min-w-[200px] ${
      selected ? 'border-blue-500' : 'border-teal-200'
    }`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      <div className="flex items-center">
        <div className="text-2xl mr-3">📂</div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-900">
            {data.name || 'Move To'}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {getMoveToDescription()}
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  )
}

export default memo(MoveToNode)