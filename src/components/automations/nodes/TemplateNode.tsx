'use client'

import { Handle, Position } from '@xyflow/react'
import { memo } from 'react'

interface TemplateNodeProps {
  data: any
  selected?: boolean
}

function TemplateNode({ data, selected }: TemplateNodeProps) {
  return (
    <div className={`px-4 py-3 shadow-md rounded-md bg-purple-50 border-2 min-w-[200px] ${
      selected ? 'border-blue-500' : 'border-purple-200'
    }`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      <div className="flex items-center">
        <div className="text-2xl mr-3">📝</div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-900">
            {data.template?.name || 'Create Template'}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {data.template?.subject || 'No subject set'}
          </div>
        </div>
      </div>
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  )
}

export default memo(TemplateNode)