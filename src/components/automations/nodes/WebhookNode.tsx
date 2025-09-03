'use client'

import { Handle, Position } from '@xyflow/react'
import { memo } from 'react'

interface WebhookNodeProps {
  data: any
  selected?: boolean
}

function WebhookNode({ data, selected }: WebhookNodeProps) {
  const hasConfig = data.webhook?.url

  return (
    <div className={`px-4 py-3 shadow-md rounded-md bg-blue-50 border-2 min-w-[200px] ${
      selected ? 'border-blue-500' : 'border-blue-200'
    }`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      <div className="flex items-center">
        <div className="text-2xl mr-3">🔗</div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-900">
            {data.name || 'Webhook'}
          </div>
          {hasConfig ? (
            <div className="text-xs text-gray-600 mt-1">
              <div className="truncate max-w-[150px]">
                {data.webhook.method} {new URL(data.webhook.url).hostname}
              </div>
            </div>
          ) : (
            <div className="text-xs text-red-500 mt-1">
              Configure webhook URL
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  )
}

export default memo(WebhookNode)