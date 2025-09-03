'use client'

import React, { useState, useCallback, useRef } from 'react'
import { ReactFlow, Node, Edge, addEdge, Connection, useNodesState, useEdgesState, Controls, Background, BackgroundVariant } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import AutomationNodeEditor from './AutomationNodeEditor'

// Custom node types
import EmailNode from './nodes/EmailNode'
import WaitNode from './nodes/WaitNode'
import ConditionNode from './nodes/ConditionNode'
import WebhookNode from './nodes/WebhookNode'
import SMSNode from './nodes/SMSNode'
import UntilNode from './nodes/UntilNode'
import WhenNode from './nodes/WhenNode'
import MoveToNode from './nodes/MoveToNode'

const nodeTypes = {
  email: EmailNode,
  wait: WaitNode,
  condition: ConditionNode,
  webhook: WebhookNode,
  sms: SMSNode,
  until: UntilNode,
  when: WhenNode,
  moveTo: MoveToNode,
}

interface AutomationFlowBuilderProps {
  nodes: any[]
  onNodesChange: (nodes: any[]) => void
  automationData: any
}

export default function AutomationFlowBuilder({ 
  nodes: initialNodes, 
  onNodesChange, 
  automationData 
}: AutomationFlowBuilderProps) {
  const [nodes, setNodes, onNodesChangeReact] = useNodesState(
    initialNodes.map(node => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: { ...node }
    }))
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedNode, setSelectedNode] = useState<any | null>(null)
  const [showNodeEditor, setShowNodeEditor] = useState(false)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  // Node template configurations
  const nodeTemplates = [
    {
      type: 'wait',
      label: 'Wait',
      icon: '⏱️',
      description: 'Add a delay before the next action',
      defaultData: {
        wait: {
          mode: 'fixed',
          days: 0,
          hours: 0,
          minutes: 5
        }
      }
    },
    {
      type: 'email',
      label: 'Send Template',
      icon: '📧',
      description: 'Send an email template',
      defaultData: {
        emailTemplate: {
          subject: 'New Email',
          content: 'Email content here...',
          trackingEnabled: true
        }
      }
    },
    {
      type: 'sms',
      label: 'SMS',
      icon: '📱',
      description: 'Send an SMS message',
      defaultData: {
        sms: {
          sender: 'YourApp',
          message: 'SMS message here...'
        }
      }
    },
    {
      type: 'condition',
      label: 'Condition',
      icon: '🔀',
      description: 'Branch flow based on conditions',
      defaultData: {
        condition: {
          type: 'rules',
          rules: {
            operator: 'all',
            conditions: []
          },
          yesBranch: [],
          noBranch: []
        }
      }
    },
    {
      type: 'until',
      label: 'Until',
      icon: '⏳',
      description: 'Wait until a condition is met',
      defaultData: {
        until: {
          type: 'behavior',
          behavior: {
            action: 'opens_campaign'
          }
        }
      }
    },
    {
      type: 'webhook',
      label: 'Webhook',
      icon: '🔗',
      description: 'Send data to external URL',
      defaultData: {
        webhook: {
          method: 'POST',
          url: 'https://your-app.com/webhook',
          body: {}
        }
      }
    },
    {
      type: 'when',
      label: 'When',
      icon: '📅',
      description: 'Wait until specific date/time',
      defaultData: {
        when: {
          datetime: new Date().toISOString()
        }
      }
    },
    {
      type: 'moveTo',
      label: 'Move to',
      icon: '📂',
      description: 'Move subscriber to segment/list',
      defaultData: {
        moveTo: {
          type: 'segment',
          segmentId: '',
          segmentName: ''
        }
      }
    }
  ]

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      if (!reactFlowWrapper.current) return

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect()
      const type = event.dataTransfer.getData('application/reactflow')

      if (!type) return

      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      }

      const template = nodeTemplates.find(t => t.type === type)
      if (!template) return

      const newNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          id: `${type}-${Date.now()}`,
          type,
          name: template.label,
          position,
          ...template.defaultData
        }
      }

      setNodes((nds) => nds.concat(newNode))
    },
    [setNodes]
  )

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
    setShowNodeEditor(true)
  }, [])

  const handleNodeSave = useCallback((updatedData: any) => {
    if (!selectedNode) return
    
    setNodes((nds) =>
      nds.map((node) =>
        node.id === selectedNode.id
          ? { ...node, data: { ...node.data, ...updatedData } }
          : node
      )
    )
    setShowNodeEditor(false)
    setSelectedNode(null)
  }, [selectedNode, setNodes])

  // Update parent component when nodes change
  const handleNodesChange = useCallback(() => {
    const updatedNodes = nodes.map(node => node.data)
    onNodesChange(updatedNodes)
  }, [nodes, onNodesChange])

  // Call update when nodes change
  React.useEffect(() => {
    handleNodesChange()
  }, [handleNodesChange])

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="h-[calc(100vh-200px)] flex">
      {/* Node Palette */}
      <div className="w-64 bg-white border-r border-gray-200 p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Automation Nodes</h3>
        
        <div className="space-y-2">
          {nodeTemplates.map((template) => (
            <div
              key={template.type}
              className="p-3 border border-gray-200 rounded-lg cursor-move hover:bg-gray-50 hover:border-gray-300 transition-colors"
              draggable
              onDragStart={(event) => onDragStart(event, template.type)}
            >
              <div className="flex items-center">
                <span className="text-xl mr-3">{template.icon}</span>
                <div>
                  <div className="text-sm font-medium text-gray-900">{template.label}</div>
                  <div className="text-xs text-gray-500">{template.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-3 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">How to use</h4>
          <p className="text-xs text-blue-700">
            Drag and drop nodes onto the canvas to build your automation flow. 
            Connect nodes by dragging from the node handles.
          </p>
        </div>
      </div>

      {/* Flow Canvas */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChangeReact}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <Controls />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>

        {/* Empty State */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🤖</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Start Building Your Automation</h3>
              <p className="text-gray-500 mb-4">
                Drag nodes from the left panel to create your automation flow
              </p>
              <div className="text-sm text-gray-400">
                Tip: Start with a "Wait" or "Send Template" node
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Node Editor Modal */}
      <AutomationNodeEditor
        node={selectedNode}
        isOpen={showNodeEditor}
        onClose={() => {
          setShowNodeEditor(false)
          setSelectedNode(null)
        }}
        onSave={handleNodeSave}
      />
    </div>
  )
}