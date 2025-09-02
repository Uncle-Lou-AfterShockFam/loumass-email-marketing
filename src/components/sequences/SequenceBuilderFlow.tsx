'use client'

import React, { useCallback, useMemo, useState, useEffect } from 'react'
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Connection,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
  Position,
  Handle,
  NodeProps,
  EdgeProps,
  getBezierPath,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useRouter } from 'next/navigation'

// Define node data types
interface EmailNodeData {
  subject?: string
  content?: string
  replyToThread?: boolean
  trackingEnabled?: boolean
  isValid?: boolean
}

interface DelayNodeData {
  delay?: { days: number; hours: number; minutes: number }
}

interface ConditionNodeData {
  condition?: {
    type?: string
    referenceStep?: string
    trueBranch?: string[]
    falseBranch?: string[]
  }
}

// Custom Node Components
const EmailNode = ({ data, selected }: NodeProps) => {
  const nodeData = data as EmailNodeData
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg bg-white border-2 ${
      selected ? 'border-blue-500' : 'border-gray-200 dark:border-gray-700'
    } ${nodeData.isValid === false ? 'border-red-500' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-gray-400"
      />
      
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="text-xs font-semibold text-gray-600">EMAIL</div>
      </div>
      
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
        {nodeData.subject || 'Untitled Email'}
      </div>
      
      {nodeData.content && (
        <div className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
          {nodeData.content.substring(0, 50)}...
        </div>
      )}
      
      <div className="flex gap-1 mt-2">
        {nodeData.replyToThread && (
          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
            In Thread
          </span>
        )}
        {nodeData.trackingEnabled && (
          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
            Tracking
          </span>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-gray-400"
      />
    </div>
  )
}

const DelayNode = ({ data, selected }: NodeProps) => {
  const nodeData = data as DelayNodeData
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg bg-white border-2 ${
      selected ? 'border-purple-500' : 'border-gray-200 dark:border-gray-700'
    }`}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-gray-400"
      />
      
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="text-xs font-semibold text-gray-600">WAIT</div>
      </div>
      
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {nodeData.delay?.days || 0}d {nodeData.delay?.hours || 0}h {nodeData.delay?.minutes || 0}m
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-gray-400"
      />
    </div>
  )
}

const ConditionNode = ({ data, selected }: NodeProps) => {
  const nodeData = data as ConditionNodeData
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg bg-white border-2 ${
      selected ? 'border-orange-500' : 'border-gray-200 dark:border-gray-700'
    } ${!nodeData.condition?.referenceStep ? 'border-red-500' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-gray-400"
      />
      
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <div className="text-xs font-semibold text-gray-600">CONDITION</div>
      </div>
      
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
        If {nodeData.condition?.type?.replace('_', ' ') || 'condition'}
      </div>
      
      {nodeData.condition?.referenceStep && (
        <div className="text-xs text-gray-600 dark:text-gray-400">
          Checking: Step {nodeData.condition.referenceStep}
        </div>
      )}
      
      {!nodeData.condition?.referenceStep && (
        <div className="text-xs text-red-600 font-medium">
          ⚠️ Select reference
        </div>
      )}
      
      {/* True/False output handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        style={{ top: '35%' }}
        className="w-3 h-3 !bg-green-500"
      />
      <div className="absolute right-[-30px] top-[32%] text-xs text-green-600 font-medium">
        Yes
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        style={{ top: '65%' }}
        className="w-3 h-3 !bg-red-500"
      />
      <div className="absolute right-[-28px] top-[62%] text-xs text-red-600 font-medium">
        No
      </div>
    </div>
  )
}

const TriggerNode = ({ data, selected }: NodeProps) => {
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg bg-gradient-to-r from-green-50 to-green-100 border-2 ${
      selected ? 'border-green-500' : 'border-green-300'
    }`}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-600">START</div>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {(data as any).label || 'Sequence Start'}
          </div>
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-green-500"
      />
    </div>
  )
}

// Custom Edge Component for conditional paths
const ConditionalEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const edgeData = data as any
  const edgeColor = edgeData?.isTrue ? '#10b981' : edgeData?.isFalse ? '#ef4444' : '#9ca3af'

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: edgeColor,
          strokeWidth: 2,
        }}
      />
      {edgeData?.label && (
        <text>
          <textPath
            href={`#${id}`}
            style={{ fontSize: 12, fill: '#374151' }}
            startOffset="50%"
            textAnchor="middle"
          >
            {edgeData.label}
          </textPath>
        </text>
      )}
    </>
  )
}

// Node types
const nodeTypes = {
  trigger: TriggerNode,
  email: EmailNode,
  delay: DelayNode,
  condition: ConditionNode,
}

// Edge types
const edgeTypes = {
  conditional: ConditionalEdge,
}

interface SequenceBuilderFlowProps {
  userId?: string
  sequenceId?: string
  editMode?: boolean
  initialData?: any
}

export default function SequenceBuilderFlow({
  userId,
  sequenceId,
  editMode = false,
  initialData
}: SequenceBuilderFlowProps) {
  const router = useRouter()
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[])
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [sequenceName, setSequenceName] = useState('')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Initialize with trigger node
  useEffect(() => {
    if (!editMode) {
      const triggerId = 'trigger-1'
      setNodes([
        {
          id: triggerId,
          type: 'trigger',
          position: { x: 100, y: 200 },
          data: { label: 'Sequence Start' },
        } as Node
      ] as Node[])
    } else if (initialData) {
      // Load existing sequence data
      loadSequenceData(initialData)
    }
  }, [editMode, initialData])

  const loadSequenceData = (data: any) => {
    setSequenceName(data.name || '')
    setDescription(data.description || '')
    
    // Convert steps to nodes and edges
    const loadedNodes: Node[] = [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 100, y: 200 },
        data: { label: 'Sequence Start' },
      }
    ]
    
    const loadedEdges: Edge[] = []
    let lastNodeId = 'trigger-1'
    
    if (data.steps && Array.isArray(data.steps)) {
      data.steps.forEach((step: any, index: number) => {
        const nodeId = step.id || `step-${index + 1}`
        const xPos = 300 + (index * 250)
        const yPos = 200 + (index % 2 === 0 ? 0 : 100)
        
        const nodeData: Node = {
          id: nodeId,
          type: step.type,
          position: { x: xPos, y: yPos },
          data: { ...step },
        }
        
        loadedNodes.push(nodeData)
        
        // Create edge from previous node
        if (step.type !== 'condition') {
          loadedEdges.push({
            id: `e-${lastNodeId}-${nodeId}`,
            source: lastNodeId,
            target: nodeId,
            type: 'smoothstep',
          })
          lastNodeId = nodeId
        }
      })
    }
    
    setNodes(loadedNodes)
    setEdges(loadedEdges)
  }

  const onConnect = useCallback(
    (params: Connection) => {
      // Check if this is a conditional connection
      const sourceNode = nodes.find(n => n.id === params.source)
      const isConditional = sourceNode?.type === 'condition'
      
      const newEdge: Edge = {
        ...params,
        id: `e-${params.source}-${params.target}-${params.sourceHandle || 'default'}`,
        type: isConditional ? 'conditional' : 'smoothstep',
        animated: false,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
        },
        data: {
          isTrue: params.sourceHandle === 'true',
          isFalse: params.sourceHandle === 'false',
        }
      }
      
      setEdges((eds) => addEdge(newEdge, eds))
    },
    [nodes, setEdges]
  )

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }, [])

  const addNode = (type: 'email' | 'delay' | 'condition') => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: { 
        x: Math.random() * 500 + 100, 
        y: Math.random() * 300 + 100 
      },
      data: type === 'email' 
        ? { subject: '', content: '', replyToThread: false, trackingEnabled: true }
        : type === 'delay'
        ? { delay: { days: 0, hours: 0, minutes: 1 } }
        : { condition: { type: 'opened' } }
    }
    
    setNodes((nds) => [...nds, newNode])
  }

  const updateNodeData = (nodeId: string, data: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...data } }
        }
        return node
      })
    )
  }

  const deleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId))
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
    setSelectedNode(null)
  }

  const saveSequence = async () => {
    if (!sequenceName) {
      alert('Please enter a sequence name')
      return
    }

    setIsSaving(true)

    // Convert nodes and edges to sequence steps
    const steps = nodes
      .filter(n => n.type !== 'trigger')
      .map((node, index) => {
        const nodeEdges = edges.filter(e => e.source === node.id)
        
        // Base step properties all steps need
        const baseStep = {
          id: node.id,
          type: node.type,
          position: node.position,
          replyToThread: false,
          trackingEnabled: true,
          nextStepId: nodeEdges[0]?.target || null
        }
        
        // For condition nodes, map the true/false branches
        if (node.type === 'condition') {
          const conditionData = node.data as any
          const trueEdge = nodeEdges.find(e => e.data?.isTrue)
          const falseEdge = nodeEdges.find(e => e.data?.isFalse)
          
          return {
            ...baseStep,
            condition: {
              ...(conditionData.condition || { type: 'opened' }),
              trueBranch: trueEdge ? [trueEdge.target] : [],
              falseBranch: falseEdge ? [falseEdge.target] : [],
            }
          }
        }
        
        // For email nodes
        if (node.type === 'email') {
          const emailData = node.data as any
          return {
            ...baseStep,
            subject: emailData.subject || '',
            content: emailData.content || '',
            replyToThread: emailData.replyToThread || false,
            trackingEnabled: emailData.trackingEnabled !== false
          }
        }
        
        // For delay nodes
        if (node.type === 'delay') {
          const delayData = node.data as any
          return {
            ...baseStep,
            delay: {
              days: delayData.delay?.days || 0,
              hours: delayData.delay?.hours || 0,
              minutes: delayData.delay?.minutes || 0
            }
          }
        }
        
        return baseStep
      })

    const payload = {
      name: sequenceName,
      description,
      steps,
      status: 'ACTIVE',
      triggerType: 'MANUAL',
      trackingEnabled: true
    }

    console.log('Saving sequence with payload:', JSON.stringify(payload, null, 2))

    try {
      const url = editMode 
        ? `/api/sequences/${sequenceId}`
        : '/api/sequences'
      
      const response = await fetch(url, {
        method: editMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        console.error('Save error response:', errorData)
        const errorMessage = errorData?.error || errorData?.details || `Failed to save sequence (${response.status})`
        throw new Error(errorMessage)
      }

      const result = await response.json()
      router.push('/dashboard/sequences')
    } catch (error: any) {
      console.error('Error saving sequence:', error)
      alert(error.message || 'Failed to save sequence')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-2xl">
            <input
              type="text"
              placeholder="Sequence Name"
              value={sequenceName}
              onChange={(e) => setSequenceName(e.target.value)}
              className="text-xl font-semibold w-full px-2 py-1 border-b-2 border-transparent hover:border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none bg-transparent text-gray-900 dark:text-gray-100"
            />
            <input
              type="text"
              placeholder="Add a description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-sm text-gray-600 w-full px-2 py-1 mt-1 bg-transparent"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard/sequences')}
              className="px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={saveSequence}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : editMode ? 'Update' : 'Save'} Sequence
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Node Palette */}
        <div className="w-64 bg-white border-r p-4">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">STEPS</h3>
          
          <div className="space-y-3">
            <button
              onClick={() => addNode('email')}
              className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-left">
                <div className="text-sm font-medium">Send Email</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Send an email to contact</div>
              </div>
            </button>

            <button
              onClick={() => addNode('delay')}
              className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-purple-500 hover:bg-purple-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-left">
                <div className="text-sm font-medium">Wait</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Add time delay</div>
              </div>
            </button>

            <button
              onClick={() => addNode('condition')}
              className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-orange-500 hover:bg-orange-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div className="text-left">
                <div className="text-sm font-medium">Condition</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Branch based on behavior</div>
              </div>
            </button>
          </div>

          <div className="mt-8">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">INSTRUCTIONS</h3>
            <div className="text-xs text-gray-600 space-y-2">
              <p>• Click buttons above to add steps</p>
              <p>• Drag from handles to connect steps</p>
              <p>• Click a step to edit its settings</p>
              <p>• Conditions have Yes/No outputs</p>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            className="bg-gray-50 dark:bg-gray-800"
          >
            <Controls />
            <MiniMap />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          </ReactFlow>
        </div>

        {/* Right Panel - Node Editor */}
        {selectedNode && selectedNode.type !== 'trigger' && (
          <div className="w-96 bg-white border-l p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">
                Edit {selectedNode.type === 'email' ? 'Email' : 
                      selectedNode.type === 'delay' ? 'Delay' : 'Condition'}
              </h3>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {selectedNode.type === 'email' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={(selectedNode.data as any).subject || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, { subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:text-gray-100"
                    placeholder="Enter email subject..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                    Email Content
                  </label>
                  <textarea
                    value={(selectedNode.data as any).content || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, { content: e.target.value })}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:text-gray-100"
                    placeholder="Write your email content..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(selectedNode.data as any).replyToThread || false}
                      onChange={(e) => updateNodeData(selectedNode.id, { replyToThread: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm">Reply in existing thread</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(selectedNode.data as any).trackingEnabled !== false}
                      onChange={(e) => updateNodeData(selectedNode.id, { trackingEnabled: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm">Enable tracking</span>
                  </label>
                </div>
              </div>
            )}

            {selectedNode.type === 'delay' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                      Days
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={(selectedNode.data as any).delay?.days ?? 0}
                      onChange={(e) => {
                        const currentDelay = (selectedNode.data as any).delay || { days: 0, hours: 0, minutes: 1 };
                        updateNodeData(selectedNode.id, { 
                          delay: { 
                            ...currentDelay,
                            days: parseInt(e.target.value) || 0
                          }
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                      Hours
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={(selectedNode.data as any).delay?.hours ?? 0}
                      onChange={(e) => {
                        const currentDelay = (selectedNode.data as any).delay || { days: 0, hours: 0, minutes: 1 };
                        updateNodeData(selectedNode.id, { 
                          delay: { 
                            ...currentDelay,
                            hours: parseInt(e.target.value) || 0
                          }
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                      Minutes
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={(selectedNode.data as any).delay?.minutes ?? 1}
                      onChange={(e) => {
                        const currentDelay = (selectedNode.data as any).delay || { days: 0, hours: 0, minutes: 1 };
                        updateNodeData(selectedNode.id, { 
                          delay: { 
                            ...currentDelay,
                            minutes: parseInt(e.target.value) || 0
                          }
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedNode.type === 'condition' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                    Condition Type
                  </label>
                  <select
                    value={(selectedNode.data as any).condition?.type || 'opened'}
                    onChange={(e) => updateNodeData(selectedNode.id, {
                      condition: {
                        ...(selectedNode.data as any).condition,
                        type: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white text-gray-900 dark:text-gray-100"
                  >
                    <option value="opened">If email was opened</option>
                    <option value="not_opened">If email was NOT opened</option>
                    <option value="clicked">If link was clicked</option>
                    <option value="not_clicked">If link was NOT clicked</option>
                    <option value="replied">If recipient replied</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                    Check Which Email?
                  </label>
                  <select
                    value={(selectedNode.data as any).condition?.referenceStep || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, {
                      condition: {
                        ...(selectedNode.data as any).condition,
                        referenceStep: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select an email step...</option>
                    {nodes
                      .filter(n => n.type === 'email' && n.id !== selectedNode.id)
                      .map(n => (
                        <option key={n.id} value={n.id}>
                          {(n.data as any).subject || 'Untitled Email'}
                        </option>
                      ))}
                  </select>
                  {!(selectedNode.data as any).condition?.referenceStep && (
                    <p className="text-xs text-red-600 mt-1">
                      ⚠️ Please select which email to check
                    </p>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">
                    How to Connect Branches
                  </h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Drag from the <span className="font-semibold text-green-600">green (Yes)</span> handle to the next step for TRUE condition</li>
                    <li>• Drag from the <span className="font-semibold text-red-600">red (No)</span> handle to the next step for FALSE condition</li>
                    <li>• Each branch can connect to different steps or end the sequence</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="mt-6 pt-6 border-t">
              <button
                onClick={() => deleteNode(selectedNode.id)}
                className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
              >
                Delete This Step
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}