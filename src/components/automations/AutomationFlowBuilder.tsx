'use client'

import React, { useState, useCallback, useRef, DragEvent } from 'react'
import { 
  ReactFlow, 
  Node, 
  Edge, 
  addEdge, 
  Connection, 
  useNodesState, 
  useEdgesState, 
  Controls, 
  Background, 
  BackgroundVariant, 
  useReactFlow, 
  ReactFlowProvider,
  Position
} from '@xyflow/react'
import AutomationNodeEditor from './AutomationNodeEditor'
import dagre from 'dagre'

// Custom node types
import EmailNode from './nodes/EmailNode'
import WaitNode from './nodes/WaitNode'
import ConditionNode from './nodes/ConditionNode'
import WebhookNode from './nodes/WebhookNode'
import SMSNode from './nodes/SMSNode'
import UntilNode from './nodes/UntilNode'
import WhenNode from './nodes/WhenNode'
import MoveToNode from './nodes/MoveToNode'
import TemplateNode from './nodes/TemplateNode'

const nodeTypes = {
  email: EmailNode,
  wait: WaitNode,
  condition: ConditionNode,
  webhook: WebhookNode,
  sms: SMSNode,
  until: UntilNode,
  when: WhenNode,
  moveTo: MoveToNode,
  template: TemplateNode,
}

interface AutomationFlowBuilderProps {
  nodes: any[]
  edges?: any[]
  onNodesChange: (data: { nodes: any[], edges: any[] }) => void
  automationData?: any
}

function AutomationFlowBuilderInner({ 
  nodes: initialNodes,
  edges: initialEdges = [],
  onNodesChange, 
  automationData 
}: AutomationFlowBuilderProps) {
  // Handle null or undefined nodes
  const safeInitialNodes = initialNodes || []
  const isReadOnly = automationData?.status === 'ACTIVE'
  
  // Safely process nodes with error handling
  let processedNodes: any[] = []
  try {
    processedNodes = safeInitialNodes.map((node, index) => {
      // Ensure node is an object
      if (!node || typeof node !== 'object') {
        console.warn('Invalid node:', node)
        return {
          id: `node-${Date.now()}-${index}`,
          type: 'default',
          position: { x: 100, y: 100 + (index * 150) },
          data: {}
        }
      }
      
      return {
        id: node.id || `node-${Date.now()}-${index}`,
        type: node.type || 'default',
        position: node.position || { x: 100, y: 100 + (index * 150) },
        data: { ...node }
      }
    })
  } catch (error) {
    console.error('Error processing nodes:', error)
    processedNodes = []
  }
  
  const [nodes, setNodes, onNodesChangeReact] = useNodesState(processedNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges || [])
  const [selectedNode, setSelectedNode] = useState<any | null>(null)
  const [showNodeEditor, setShowNodeEditor] = useState(false)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()

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
      label: 'Send Email',
      icon: '📧',
      description: 'Send a custom email or template',
      defaultData: {
        emailTemplate: {
          useTemplate: false,
          templateId: null,
          subject: 'New Email',
          content: 'Email content here...',
          trackingEnabled: true
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
    }
  ]

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()

      // Prevent drops when automation is active
      if (isReadOnly) return

      const type = event.dataTransfer.getData('application/reactflow')
      if (typeof type === 'undefined' || !type) {
        return
      }

      // Calculate position using screenToFlowPosition
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const template = nodeTemplates.find(t => t.type === type)
      if (!template) return

      const newNode = {
        id: `${type}-${Date.now()}`,
        type: type as string,
        position,
        data: {
          id: `${type}-${Date.now()}`,
          type,
          name: template.label,
          position,
          ...template.defaultData
        }
      }

      setNodes((nds) => [...nds, newNode])
    },
    [setNodes, screenToFlowPosition, isReadOnly]
  )

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    // Prevent editing when automation is active
    if (isReadOnly) return
    
    setSelectedNode(node)
    setShowNodeEditor(true)
  }, [isReadOnly])

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

  // Update parent component when nodes or edges change
  const handleNodesChange = useCallback(() => {
    // Preserve the full node structure but extract the essential data
    const updatedNodes = nodes.map(node => {
      // Extract data without position to avoid duplication
      const { position: dataPosition, ...restData } = node.data || {}
      return {
        id: node.id,
        type: restData.type || node.type,
        position: node.position, // Use the node's position, not data.position
        ...restData
      }
    })
    
    // Include edges for connections between nodes
    const updatedEdges = edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type
    }))
    
    if (onNodesChange) {
      onNodesChange({ nodes: updatedNodes, edges: updatedEdges })
    }
  }, [nodes, edges, onNodesChange])

  // Call update when nodes or edges change
  React.useEffect(() => {
    handleNodesChange()
  }, [handleNodesChange])

  const onDragStart = (event: DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  // Auto-layout function using dagre
  const autoLayoutNodes = useCallback(() => {
    const dagreGraph = new dagre.graphlib.Graph()
    dagreGraph.setDefaultEdgeLabel(() => ({}))
    
    // Configure layout
    dagreGraph.setGraph({
      rankdir: 'TB', // Top to bottom layout
      nodesep: 60,   // Horizontal spacing between nodes (reduced from 100)
      ranksep: 80,   // Vertical spacing between layers (reduced from 150)
      align: 'UL',   // Align to upper left
      marginx: 30,   // Reduced margin
      marginy: 30    // Reduced margin
    })
    
    // Add nodes to dagre graph
    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { 
        width: 200,  // Approximate node width
        height: 100  // Approximate node height
      })
    })
    
    // Add edges to dagre graph
    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target)
    })
    
    // Calculate layout
    dagre.layout(dagreGraph)
    
    // Apply new positions to nodes
    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id)
      
      // Center the node position (dagre gives center coordinates)
      const position = {
        x: nodeWithPosition.x - 100, // Subtract half of node width
        y: nodeWithPosition.y - 50   // Subtract half of node height
      }
      
      return {
        ...node,
        position,
        // Set position handles for better edge routing
        targetPosition: Position.Top,
        sourcePosition: Position.Bottom
      }
    })
    
    setNodes(layoutedNodes)
    
    // Optional: Fit view to show all nodes after layout
    setTimeout(() => {
      const reactFlow = document.querySelector('.react-flow')
      if (reactFlow) {
        const event = new Event('resize')
        window.dispatchEvent(event)
      }
    }, 50)
  }, [nodes, edges, setNodes])

  return (
    <div className="h-[calc(100vh-200px)] flex relative">
      {/* Read-only overlay */}
      {isReadOnly && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-yellow-50 border-b border-yellow-200 px-4 py-2">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-yellow-800">
              This automation is currently active and cannot be modified. Pause or stop it to make changes.
            </span>
          </div>
        </div>
      )}
      
      {/* Node Palette */}
      <div className={`w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto ${isReadOnly ? 'opacity-50 pointer-events-none' : ''}`}>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Automation Nodes</h3>
        
        <div className="space-y-3">
          {nodeTemplates.map((template) => (
            <div
              key={template.type}
              className="p-3 border-2 border-gray-200 rounded-lg cursor-grab hover:cursor-grab active:cursor-grabbing hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md"
              draggable={true}
              onDragStart={(event) => onDragStart(event, template.type)}
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">{template.icon}</span>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{template.label}</div>
                  <div className="text-xs text-gray-600 mt-1">{template.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-medium text-blue-900 mb-2">💡 How to use</h4>
          <p className="text-xs text-blue-700">
            <strong>Drag</strong> nodes from this panel and <strong>drop</strong> them onto the canvas to build your automation flow.
          </p>
        </div>
      </div>

      {/* Flow Canvas */}
      <div className="flex-1 relative bg-gray-50" ref={reactFlowWrapper}>
        {/* Auto-layout button */}
        {!isReadOnly && nodes.length > 0 && (
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={autoLayoutNodes}
              className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 flex items-center gap-2"
              title="Auto-arrange nodes for optimal flow visualization"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Auto-arrange</span>
            </button>
          </div>
        )}
        
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={isReadOnly ? undefined : onNodesChangeReact}
          onEdgesChange={isReadOnly ? undefined : onEdgesChange}
          onConnect={isReadOnly ? undefined : onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          className={`bg-gray-50 ${isReadOnly ? 'pointer-events-none' : ''}`}
          nodesDraggable={!isReadOnly}
          nodesConnectable={!isReadOnly}
          elementsSelectable={!isReadOnly}
        >
          <Controls />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        </ReactFlow>

        {/* Empty State */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-6xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Start Building Your Automation</h3>
              <p className="text-gray-600 mb-4 max-w-md">
                Drag automation nodes from the left panel and drop them here to create your workflow
              </p>
              <div className="text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border border-gray-200 inline-block">
                💡 Tip: Start with a <strong>"Wait"</strong> or <strong>"Send Template"</strong> node
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
        currentAutomation={automationData}
      />
    </div>
  )
}

export default function AutomationFlowBuilder(props: AutomationFlowBuilderProps) {
  try {
    return (
      <ReactFlowProvider>
        <AutomationFlowBuilderInner {...props} />
      </ReactFlowProvider>
    )
  } catch (error) {
    console.error('AutomationFlowBuilder error:', error)
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)] bg-gray-50">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Automation</h3>
          <p className="text-gray-600">There was an error loading the automation flow. Please refresh the page.</p>
        </div>
      </div>
    )
  }
}