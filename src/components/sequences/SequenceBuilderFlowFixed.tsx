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
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

// Dynamically import the rich text editor to avoid SSR issues
const RichTextEditor = dynamic(
  () => import('@/components/RichTextEditor').then(mod => mod.default),
  { 
    ssr: false,
    loading: () => <div className="h-64 bg-gray-50 animate-pulse rounded-lg" />
  }
)

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
      selected ? 'border-blue-500' : 'border-gray-200'
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
      
      <div className="text-sm font-medium text-gray-900 mb-1">
        {nodeData.subject || 'Untitled Email'}
      </div>
      
      {nodeData.content && (
        <div className="text-xs text-gray-500 truncate max-w-[200px]">
          {nodeData.content.replace(/<[^>]*>/g, '').substring(0, 50)}...
        </div>
      )}
      
      <div className="flex gap-1 mt-2">
        {nodeData.replyToThread && (
          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
            In Thread
          </span>
        )}
        {nodeData.trackingEnabled !== false && (
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
  const delay = nodeData.delay || { days: 0, hours: 0, minutes: 0 }
  
  const formatDelay = () => {
    const parts = []
    if (delay.days > 0) parts.push(`${delay.days}d`)
    if (delay.hours > 0) parts.push(`${delay.hours}h`)
    if (delay.minutes > 0) parts.push(`${delay.minutes}m`)
    return parts.length > 0 ? parts.join(' ') : 'No delay'
  }
  
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg bg-white border-2 ${
      selected ? 'border-purple-500' : 'border-gray-200'
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
        <div className="text-xs font-semibold text-gray-600">DELAY</div>
      </div>
      
      <div className="text-sm font-medium text-gray-900">
        Wait: {formatDelay()}
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
  const conditionType = nodeData.condition?.type || 'opened'
  
  const getConditionLabel = () => {
    switch (conditionType) {
      case 'opened': return 'If Opened'
      case 'not_opened': return 'If Not Opened'
      case 'clicked': return 'If Clicked'
      case 'not_clicked': return 'If Not Clicked'
      case 'replied': return 'If Replied'
      case 'not_replied': return 'If Not Replied'
      case 'opened_no_reply': return 'Opened but NO Reply'
      case 'opened_no_click': return 'Opened but NO Click'
      case 'clicked_no_reply': return 'Clicked but NO Reply'
      default: return 'Condition'
    }
  }
  
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg bg-white border-2 ${
      selected ? 'border-orange-500' : 'border-gray-200'
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
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="text-xs font-semibold text-gray-600">CONDITION</div>
      </div>
      
      <div className="text-sm font-medium text-gray-900 mb-2">
        {getConditionLabel()}
      </div>
      
      {!nodeData.condition?.referenceStep && (
        <div className="text-xs text-red-600">
          ⚠️ No email selected
        </div>
      )}
      
      <div className="flex justify-between mt-3 gap-2">
        <Handle
          type="source"
          position={Position.Right}
          id="true"
          style={{ top: '40%' }}
          className="w-3 h-3 !bg-green-500"
        />
        <Handle
          type="source"
          position={Position.Right}
          id="false"
          style={{ top: '60%' }}
          className="w-3 h-3 !bg-red-500"
        />
      </div>
      
      <div className="absolute -right-8 top-[35%] text-xs text-green-600 font-medium">
        Yes
      </div>
      <div className="absolute -right-8 top-[55%] text-xs text-red-600 font-medium">
        No
      </div>
    </div>
  )
}

const TriggerNode = ({ data, selected }: NodeProps) => {
  const nodeData = data as any
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg bg-gradient-to-r from-green-500 to-green-600 border-2 ${
      selected ? 'border-green-700' : 'border-green-400'
    }`}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <div className="text-xs font-semibold text-white/90">START</div>
          <div className="text-sm font-medium text-white">
            {nodeData.label || 'Sequence Start'}
          </div>
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-white"
      />
    </div>
  )
}

// Custom Edge Component for Conditional Branches
const ConditionalEdge = ({ 
  id, 
  sourceX, 
  sourceY, 
  targetX, 
  targetY, 
  sourcePosition, 
  targetPosition, 
  data,
  markerEnd 
}: EdgeProps) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })
  
  const edgeColor = data?.isTrue ? '#10b981' : data?.isFalse ? '#ef4444' : '#6b7280'
  
  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        strokeWidth={2}
        stroke={edgeColor}
        fill="none"
        markerEnd={markerEnd}
      />
    </>
  )
}

const nodeTypes = {
  email: EmailNode,
  delay: DelayNode,
  condition: ConditionNode,
  trigger: TriggerNode,
}

const edgeTypes = {
  conditional: ConditionalEdge,
}

interface SequenceBuilderFlowProps {
  editMode?: boolean
  sequenceId?: string
  initialData?: any
}

function SequenceBuilderFlowInner({
  editMode = false,
  sequenceId,
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
      ])
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
        const position = step.position || { 
          x: 300 + (index * 250), 
          y: 200 + (index % 2 === 0 ? 0 : 100) 
        }
        
        // Prepare node data based on step type
        let nodeData: any = {}
        
        if (step.type === 'email') {
          nodeData = {
            subject: step.subject || '',
            content: step.content || '',
            replyToThread: step.replyToThread || false,
            trackingEnabled: step.trackingEnabled !== false
          }
        } else if (step.type === 'delay') {
          nodeData = {
            delay: step.delay || { days: 0, hours: 0, minutes: 0 }
          }
        } else if (step.type === 'condition') {
          nodeData = {
            condition: step.condition || { type: 'opened' }
          }
        }
        
        const node: Node = {
          id: nodeId,
          type: step.type,
          position,
          data: nodeData,
        }
        
        loadedNodes.push(node)
        
        // Create edges based on step connections
        if (step.type === 'condition' && step.condition) {
          // Handle conditional branches
          if (step.condition.trueBranch?.length > 0) {
            loadedEdges.push({
              id: `${nodeId}-true-${step.condition.trueBranch[0]}`,
              source: nodeId,
              sourceHandle: 'true',
              target: step.condition.trueBranch[0],
              type: 'conditional',
              data: { isTrue: true },
              markerEnd: { type: MarkerType.ArrowClosed }
            })
          }
          if (step.condition.falseBranch?.length > 0) {
            loadedEdges.push({
              id: `${nodeId}-false-${step.condition.falseBranch[0]}`,
              source: nodeId,
              sourceHandle: 'false',
              target: step.condition.falseBranch[0],
              type: 'conditional',
              data: { isFalse: true },
              markerEnd: { type: MarkerType.ArrowClosed }
            })
          }
        }
        
        // Handle regular sequential connections using nextStepId
        if (step.nextStepId && step.type !== 'condition') {
          loadedEdges.push({
            id: `${nodeId}-${step.nextStepId}`,
            source: nodeId,
            target: step.nextStepId,
            markerEnd: { type: MarkerType.ArrowClosed }
          })
        }
      })
      
      // Connect trigger to first step if exists
      if (loadedNodes.length > 1 && data.steps && data.steps.length > 0) {
        const firstStepId = data.steps[0].id || 'step-1'
        loadedEdges.push({
          id: `trigger-1-${firstStepId}`,
          source: 'trigger-1',
          target: firstStepId,
          markerEnd: { type: MarkerType.ArrowClosed }
        })
      }
    }
    
    // Deduplicate edges based on source-target pairs
    const edgeMap = new Map<string, Edge>()
    loadedEdges.forEach(edge => {
      const key = `${edge.source}-${edge.sourceHandle || 'default'}-${edge.target}`
      if (!edgeMap.has(key)) {
        edgeMap.set(key, edge)
      }
    })
    
    setNodes(loadedNodes)
    setEdges(Array.from(edgeMap.values()))
  }

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return
    
    const sourceNode = nodes.find(n => n.id === connection.source)
    
    // Create appropriate edge based on source node type
    if (sourceNode?.type === 'condition') {
      const edgeData = connection.sourceHandle === 'true' 
        ? { isTrue: true } 
        : { isFalse: true }
      
      setEdges((eds) => addEdge({
        ...connection,
        type: 'conditional',
        data: edgeData,
        markerEnd: { type: MarkerType.ArrowClosed }
      }, eds))
    } else {
      setEdges((eds) => addEdge({
        ...connection,
        markerEnd: { type: MarkerType.ArrowClosed }
      }, eds))
    }
  }, [nodes, setEdges])

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.type !== 'trigger') {
      setSelectedNode(node)
    }
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const addNode = (type: 'email' | 'delay' | 'condition') => {
    const newNode = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: 250 + nodes.length * 100, y: 100 + nodes.length * 50 },
      data: type === 'email' 
        ? { subject: '', content: '', replyToThread: false, trackingEnabled: true }
        : type === 'delay'
        ? { delay: { days: 0, hours: 0, minutes: 0 } }
        : { condition: { type: 'opened' } }
    }
    
    setNodes((nds) => [...nds, newNode])
  }

  const updateNodeData = useCallback((nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          // Deep merge the data to preserve nested objects
          const updatedData = { ...node.data }
          
          // Handle nested updates for condition and delay
          if (newData.condition !== undefined) {
            updatedData.condition = {
              ...(node.data as any).condition,
              ...newData.condition
            }
          } else if (newData.delay !== undefined) {
            updatedData.delay = {
              ...(node.data as any).delay,
              ...newData.delay
            }
          } else {
            // For simple properties, just merge
            Object.assign(updatedData, newData)
          }
          
          return { ...node, data: updatedData }
        }
        return node
      })
    )
    
    // Update the selected node state as well to ensure UI updates
    if (selectedNode && selectedNode.id === nodeId) {
      setSelectedNode(prev => {
        if (!prev) return null
        const updatedData = { ...prev.data }
        
        if (newData.condition !== undefined) {
          updatedData.condition = {
            ...(prev.data as any).condition,
            ...newData.condition
          }
        } else if (newData.delay !== undefined) {
          updatedData.delay = {
            ...(prev.data as any).delay,
            ...newData.delay
          }
        } else {
          Object.assign(updatedData, newData)
        }
        
        return { ...prev, data: updatedData }
      })
    }
  }, [selectedNode])

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
      .map((node) => {
        const nodeEdges = edges.filter(e => e.source === node.id)
        
        // Base step properties
        const baseStep: any = {
          id: node.id,
          type: node.type,
          position: node.position,
        }
        
        // Add type-specific properties
        if (node.type === 'email') {
          const emailData = node.data as EmailNodeData
          Object.assign(baseStep, {
            subject: emailData.subject || '',
            content: emailData.content || '',
            replyToThread: emailData.replyToThread || false,
            trackingEnabled: emailData.trackingEnabled !== false
          })
        } else if (node.type === 'delay') {
          const delayData = node.data as DelayNodeData
          Object.assign(baseStep, {
            delay: delayData.delay || { days: 0, hours: 0, minutes: 0 }
          })
        } else if (node.type === 'condition') {
          const conditionData = node.data as ConditionNodeData
          const trueEdge = nodeEdges.find(e => e.sourceHandle === 'true')
          const falseEdge = nodeEdges.find(e => e.sourceHandle === 'false')
          
          Object.assign(baseStep, {
            condition: {
              ...(conditionData.condition || { type: 'opened' }),
              trueBranch: trueEdge ? [trueEdge.target] : [],
              falseBranch: falseEdge ? [falseEdge.target] : [],
            }
          })
        }
        
        // Add next step for non-condition nodes
        if (node.type !== 'condition' && nodeEdges.length > 0) {
          baseStep.nextStepId = nodeEdges[0].target
        }
        
        return baseStep
      })

    const payload = {
      name: sequenceName,
      description,
      steps,
      status: editMode ? (initialData?.status || 'DRAFT') : 'DRAFT',
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
      console.log('Sequence saved successfully:', result)
      router.push('/dashboard/sequences')
      router.refresh() // Force refresh to show updated data
    } catch (error: any) {
      console.error('Error saving sequence:', error)
      alert(error.message || 'Failed to save sequence')
    } finally {
      setIsSaving(false)
    }
  }

  // Ensure selected node is always in sync with nodes
  useEffect(() => {
    if (selectedNode) {
      const currentNode = nodes.find(n => n.id === selectedNode.id)
      if (currentNode && currentNode.data !== selectedNode.data) {
        setSelectedNode(currentNode)
      }
    }
  }, [nodes, selectedNode])

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-2xl">
            <input
              type="text"
              placeholder="Sequence Name"
              value={sequenceName}
              onChange={(e) => setSequenceName(e.target.value)}
              className="text-xl font-semibold w-full px-2 py-1 border-b-2 border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none bg-transparent text-gray-900"
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
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
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
        {/* Left Sidebar - Step Palette */}
        <div className="w-64 bg-white border-r p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">STEPS</h3>
          
          <div className="space-y-3">
            <button
              onClick={() => addNode('email')}
              className="w-full flex items-center gap-3 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-sm text-gray-700">Send an email to contact</span>
            </button>

            <button
              onClick={() => addNode('delay')}
              className="w-full flex items-center gap-3 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm text-gray-700">Add time delay</span>
            </button>

            <button
              onClick={() => addNode('condition')}
              className="w-full flex items-center gap-3 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-sm text-gray-700">Branch based on behavior</span>
            </button>
          </div>

          <div className="mt-8 pt-8 border-t">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">INSTRUCTIONS</h3>
            <ul className="space-y-2 text-xs text-gray-600">
              <li>• Click buttons above to add steps</li>
              <li>• Drag from handles to connect steps</li>
              <li>• Click a step to edit its settings</li>
              <li>• Conditions have Yes/No outputs</li>
            </ul>
          </div>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
          >
            <Background variant={BackgroundVariant.Dots} />
            <MiniMap />
            <Controls />
          </ReactFlow>
        </div>

        {/* Right Sidebar - Step Editor */}
        {selectedNode && (
          <div className="w-96 bg-white border-l p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit {selectedNode.type === 'email' ? 'Email' : 
                       selectedNode.type === 'delay' ? 'Delay' : 
                       'Condition'} Step
              </h3>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {selectedNode.type === 'email' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={(selectedNode.data as EmailNodeData).subject || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, { subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-gray-900"
                    placeholder="Enter email subject..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Content
                  </label>
                  <RichTextEditor
                    value={(selectedNode.data as EmailNodeData).content || ''}
                    onChange={(content) => updateNodeData(selectedNode.id, { content })}
                    placeholder="Write your email content..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(selectedNode.data as EmailNodeData).replyToThread === true}
                      onChange={(e) => updateNodeData(selectedNode.id, { replyToThread: e.target.checked })}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Reply in existing thread</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(selectedNode.data as EmailNodeData).trackingEnabled !== false}
                      onChange={(e) => updateNodeData(selectedNode.id, { trackingEnabled: e.target.checked })}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Enable tracking</span>
                  </label>
                </div>
              </div>
            )}

            {selectedNode.type === 'delay' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Days
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={(selectedNode.data as DelayNodeData).delay?.days || 0}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0
                        const currentDelay = (selectedNode.data as DelayNodeData).delay || { days: 0, hours: 0, minutes: 0 }
                        updateNodeData(selectedNode.id, { 
                          delay: { ...currentDelay, days: value }
                        })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hours
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={(selectedNode.data as DelayNodeData).delay?.hours || 0}
                      onChange={(e) => {
                        const value = Math.min(23, Math.max(0, parseInt(e.target.value) || 0))
                        const currentDelay = (selectedNode.data as DelayNodeData).delay || { days: 0, hours: 0, minutes: 0 }
                        updateNodeData(selectedNode.id, { 
                          delay: { ...currentDelay, hours: value }
                        })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minutes
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={(selectedNode.data as DelayNodeData).delay?.minutes || 0}
                      onChange={(e) => {
                        const value = Math.min(59, Math.max(0, parseInt(e.target.value) || 0))
                        const currentDelay = (selectedNode.data as DelayNodeData).delay || { days: 0, hours: 0, minutes: 0 }
                        updateNodeData(selectedNode.id, { 
                          delay: { ...currentDelay, minutes: value }
                        })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white text-gray-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedNode.type === 'condition' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Condition Type
                  </label>
                  <select
                    value={(selectedNode.data as ConditionNodeData).condition?.type || 'opened'}
                    onChange={(e) => updateNodeData(selectedNode.id, {
                      condition: {
                        ...(selectedNode.data as ConditionNodeData).condition,
                        type: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white text-gray-900"
                  >
                    <option value="opened">If email was opened</option>
                    <option value="not_opened">If email was NOT opened</option>
                    <option value="clicked">If link was clicked</option>
                    <option value="not_clicked">If link was NOT clicked</option>
                    <option value="replied">If recipient replied</option>
                    <option value="not_replied">If recipient did NOT reply</option>
                    <option value="opened_no_reply">If opened but NO reply</option>
                    <option value="opened_no_click">If opened but NO click</option>
                    <option value="clicked_no_reply">If clicked but NO reply</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Check Which Email?
                  </label>
                  <select
                    value={(selectedNode.data as ConditionNodeData).condition?.referenceStep || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, {
                      condition: {
                        ...(selectedNode.data as ConditionNodeData).condition,
                        referenceStep: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white text-gray-900"
                  >
                    <option value="">Select an email step...</option>
                    {nodes
                      .filter(n => n.type === 'email' && n.id !== selectedNode.id)
                      .map(n => (
                        <option key={n.id} value={n.id}>
                          {(n.data as EmailNodeData).subject || 'Untitled Email'}
                        </option>
                      ))}
                  </select>
                  {!(selectedNode.data as ConditionNodeData).condition?.referenceStep && (
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

// Export wrapped with ReactFlowProvider
export default function SequenceBuilderFlow(props: SequenceBuilderFlowProps) {
  return (
    <ReactFlowProvider>
      <SequenceBuilderFlowInner {...props} />
    </ReactFlowProvider>
  )
}