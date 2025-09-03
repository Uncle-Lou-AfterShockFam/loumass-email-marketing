'use client'

import { Handle, Position } from '@xyflow/react'
import { memo } from 'react'

interface SMSNodeProps {
  data: any
  selected?: boolean
}

function SMSNode({ data, selected }: SMSNodeProps) {
  const hasConfig = data.sms?.message

  return (
    <div className={`px-4 py-3 shadow-md rounded-md bg-green-50 border-2 min-w-[200px] ${
      selected ? 'border-blue-500' : 'border-green-200'
    }`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      <div className="flex items-center">
        <div className="text-2xl mr-3">📱</div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-900">
            {data.name || 'SMS'}
          </div>
          {hasConfig ? (
            <div className="text-xs text-gray-600 mt-1">
              <div className="truncate max-w-[150px]">
                From: {data.sms.sender}
              </div>
              <div className="text-gray-400 mt-1">
                {data.sms.message.length} characters
              </div>
            </div>
          ) : (
            <div className="text-xs text-red-500 mt-1">
              Configure SMS message
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  )
}

export default memo(SMSNode)