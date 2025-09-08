import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for automation node
const automationNodeSchema = z.object({
  id: z.string(),
  type: z.enum(['trigger', 'wait', 'email', 'sms', 'condition', 'until', 'webhook', 'when', 'move_to']),
  name: z.string().optional(),
  
  // Email template node
  emailTemplate: z.object({
    subject: z.string(),
    content: z.string(),
    trackingEnabled: z.boolean().optional(),
    utmTracking: z.boolean().optional(),
    subdomain: z.string().optional()
  }).optional(),
  
  // Wait node configuration
  wait: z.object({
    mode: z.enum(['fixed', 'variable']),
    // Fixed time
    days: z.number().optional(),
    hours: z.number().optional(),
    minutes: z.number().optional(),
    // Variable time
    waitUntil: z.object({
      type: z.enum(['day_of_month', 'day_of_week']),
      value: z.union([z.number(), z.string()]), // Day number or day name
      time: z.string().optional() // HH:mm format
    }).optional()
  }).optional(),
  
  // SMS configuration
  sms: z.object({
    sender: z.string().max(11),
    message: z.string(),
    customTags: z.boolean().optional()
  }).optional(),
  
  // Condition configuration
  condition: z.object({
    type: z.enum(['rules', 'behavior']),
    // Rules-based conditions
    rules: z.object({
      operator: z.enum(['all', 'any']),
      conditions: z.array(z.object({
        field: z.string(),
        operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'not_contains']),
        value: z.string()
      }))
    }).optional(),
    // Behavior-based conditions
    behavior: z.object({
      action: z.enum(['opens_campaign', 'not_opens_campaign', 'clicks', 'not_clicks']),
      campaignRef: z.string().optional()
    }).optional(),
    // Branch paths
    yesBranch: z.array(z.string()),
    noBranch: z.array(z.string())
  }).optional(),
  
  // Until configuration (similar to condition but waits)
  until: z.object({
    type: z.enum(['rules', 'behavior']),
    rules: z.object({
      operator: z.enum(['all', 'any']),
      conditions: z.array(z.object({
        field: z.string(),
        operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'not_contains']),
        value: z.string()
      }))
    }).optional(),
    behavior: z.object({
      action: z.enum(['opens_campaign', 'clicks']),
      campaignRef: z.string().optional()
    }).optional()
  }).optional(),
  
  // Webhook configuration
  webhook: z.object({
    method: z.enum(['GET', 'POST']),
    url: z.string().url(),
    body: z.record(z.string(), z.string()).optional()
  }).optional(),
  
  // When configuration (specific date/time)
  when: z.object({
    datetime: z.string() // ISO datetime string
  }).optional(),
  
  // Move to configuration
  moveTo: z.object({
    targetNodeId: z.string()
  }).optional(),
  
  // Visual positioning
  position: z.object({
    x: z.number(),
    y: z.number()
  }),
  
  // Connections
  nextNodes: z.array(z.string()).optional()
})

// Validation schema for automation creation
const createAutomationSchema = z.object({
  name: z.string().min(1, 'Automation name is required'),
  description: z.string().optional(),
  triggerEvent: z.enum(['NEW_SUBSCRIBER', 'SPECIFIC_DATE', 'SUBSCRIBER_SEGMENT', 'WEBHOOK', 'MANUAL']),
  triggerData: z.object({
    listId: z.string().optional(),
    segmentId: z.string().optional(),
    specificDate: z.string().optional(),
    webhookUrl: z.string().optional()
  }).optional(),
  applyToExisting: z.boolean().default(false),
  trackingEnabled: z.boolean().default(true),
  nodes: z.union([
    z.array(automationNodeSchema), // Old format: array of nodes
    z.object({                      // New format: object with nodes and edges
      nodes: z.array(automationNodeSchema),
      edges: z.array(z.any())
    })
  ]),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED']).default('DRAFT')
})

// POST /api/automations - Create new automation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // 🚨 DEBUG: Log the exact request data
    console.log('🔍 AUTOMATION CREATION DEBUG:', {
      requestBody: JSON.stringify(body, null, 2),
      nodesType: Array.isArray(body.nodes) ? 'array' : 'object',
      nodesLength: Array.isArray(body.nodes) ? body.nodes.length : body.nodes?.nodes?.length || 0
    })
    
    // Validate request data
    const validationResult = createAutomationSchema.safeParse(body)
    if (!validationResult.success) {
      console.error('Automation validation failed:', validationResult.error.format())
      return NextResponse.json({ 
        error: 'Invalid data', 
        details: validationResult.error.format() 
      }, { status: 400 })
    }

    const { name, description, triggerEvent, triggerData, applyToExisting, trackingEnabled, nodes, status } = validationResult.data

    // Handle both old array format and new object format
    let flowData: { nodes: any[], edges: any[] }
    
    if (Array.isArray(nodes)) {
      // Old format: convert to new format with automatic trigger
      flowData = {
        nodes: nodes,
        edges: []
      }
    } else {
      // New format
      flowData = {
        nodes: nodes.nodes || [],
        edges: nodes.edges || []
      }
    }
    
    // 🚀 AUTO-GENERATE FLOW: If no nodes provided, create a basic email automation
    if (flowData.nodes.length === 0) {
      console.log('🔧 AUTO-GENERATING: No nodes provided, creating basic email automation...')
      
      const timestamp = Date.now()
      const triggerNode = {
        id: `trigger-${timestamp}`,
        type: 'trigger',
        name: 'Automation Start',
        position: { x: 50, y: 100 },
        data: {
          label: 'Automation Start',
          triggerType: triggerEvent
        }
      }
      
      const emailNode = {
        id: `email-${timestamp + 1}`,
        type: 'email',
        name: 'Send Email',
        position: { x: 300, y: 100 },
        emailTemplate: {
          subject: 'Welcome!',
          content: `Hi {{firstName}},

Welcome to our community! We're excited to have you on board.

Best regards,
The Team`,
          trackingEnabled: true
        },
        data: {
          label: 'Send Email'
        }
      }
      
      const edge = {
        id: `trigger-to-${emailNode.id}`,
        source: triggerNode.id,
        target: emailNode.id,
        type: 'smoothstep'
      }
      
      flowData = {
        nodes: [triggerNode, emailNode],
        edges: [edge]
      }
      
      console.log('✅ AUTO-GENERATED FLOW:', {
        triggerNodeId: triggerNode.id,
        emailNodeId: emailNode.id,
        edgeId: edge.id,
        totalNodes: 2,
        totalEdges: 1
      })
    }
    
    // 🚨 DEBUG: Log flow data before trigger addition
    console.log('📊 FLOW DATA BEFORE TRIGGER:', {
      nodesCount: flowData.nodes.length,
      edgesCount: flowData.edges.length,
      nodeTypes: flowData.nodes.map((n: any) => n.type)
    })
    
    // Auto-add trigger node and connect to first node if missing
    const hasTriggerNode = flowData.nodes.some((n: any) => n.type === 'trigger')
    console.log('🔍 HAS TRIGGER CHECK:', { hasTriggerNode, nodeCount: flowData.nodes.length })
    
    if (!hasTriggerNode && flowData.nodes.length > 0) {
      const triggerNode = {
        id: `trigger-${Date.now()}`,
        type: 'trigger',
        name: 'Automation Start',
        position: { x: 50, y: 100 },
        data: {
          label: 'Automation Start',
          triggerType: triggerEvent
        }
      }
      
      // Add trigger at the beginning
      flowData.nodes.unshift(triggerNode)
      
      // Connect trigger to first user-created node
      if (flowData.nodes.length > 1) {
        const firstUserNode = flowData.nodes[1]
        flowData.edges.push({
          id: `trigger-to-${firstUserNode.id}`,
          source: triggerNode.id,
          target: firstUserNode.id,
          type: 'smoothstep'
        })
        console.log('✅ TRIGGER ADDED:', { 
          triggerNodeId: triggerNode.id, 
          connectedToNodeId: firstUserNode.id,
          totalNodes: flowData.nodes.length,
          totalEdges: flowData.edges.length
        })
      } else {
        console.log('⚠️ NO CONNECTION: Only trigger node exists')
      }
    } else if (hasTriggerNode) {
      console.log('✅ TRIGGER EXISTS: Skipping auto-add')
    } else {
      console.log('❌ NO NODES: Cannot add trigger to empty automation')
    }
    
    // 🚨 DEBUG: Log final flow data
    console.log('🎯 FINAL FLOW DATA:', {
      nodesCount: flowData.nodes.length,
      edgesCount: flowData.edges.length,
      finalNodeTypes: flowData.nodes.map((n: any) => ({ id: n.id, type: n.type }))
    })
    
    // Validate automation logic
    const emailNodes = flowData.nodes.filter((n: any) => n.type === 'email')
    if (emailNodes.length === 0) {
      return NextResponse.json({ 
        error: 'Automation must contain at least one email node' 
      }, { status: 400 })
    }

    // Check that condition nodes are properly configured
    for (const node of flowData.nodes.filter((n: any) => n.type === 'condition')) {
      if (status === 'ACTIVE' && node.condition) {
        if (node.condition.type === 'behavior' && !node.condition.behavior?.campaignRef) {
          return NextResponse.json({
            error: `Behavior condition must reference a campaign`
          }, { status: 400 })
        }
      }
    }

    // Create automation
    const automation = await prisma.automation.create({
      data: {
        userId: session.user.id,
        name,
        description,
        triggerEvent,
        triggerData: triggerData || {},
        applyToExisting,
        trackingEnabled,
        nodes: flowData,
        status
      },
      include: {
        nodeStats: true,
        _count: {
          select: {
            executions: true
          }
        }
      }
    })

    // If applying to existing subscribers and status is ACTIVE, trigger enrollment
    if (applyToExisting && status === 'ACTIVE') {
      // TODO: Implement enrollment of existing contacts
      console.log('TODO: Enroll existing contacts for automation:', automation.id)
    }

    return NextResponse.json({
      success: true,
      automation: {
        id: automation.id,
        name: automation.name,
        description: automation.description,
        triggerEvent: automation.triggerEvent,
        triggerData: automation.triggerData,
        applyToExisting: automation.applyToExisting,
        trackingEnabled: automation.trackingEnabled,
        nodes: automation.nodes,
        status: automation.status,
        totalEntered: automation.totalEntered,
        currentlyActive: automation.currentlyActive,
        totalCompleted: automation.totalCompleted,
        totalExecutions: automation._count.executions,
        nodeCount: flowData.nodes.length,
        createdAt: automation.createdAt,
        updatedAt: automation.updatedAt
      }
    })

  } catch (error) {
    console.error('Error creating automation:', error)
    return NextResponse.json({ 
      error: 'Failed to create automation' 
    }, { status: 500 })
  }
}

// GET /api/automations - List user's automations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const triggerEvent = searchParams.get('trigger')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build filters
    const where: any = {
      userId: session.user.id
    }

    if (status) {
      where.status = status.toUpperCase()
    }

    if (triggerEvent) {
      where.triggerEvent = triggerEvent.toUpperCase()
    }

    // Fetch automations with execution counts
    const automations = await prisma.automation.findMany({
      where,
      include: {
        _count: {
          select: {
            executions: true
          }
        },
        executions: {
          where: {
            status: 'ACTIVE'
          },
          select: {
            id: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    })

    // Calculate metrics for each automation
    const automationsWithMetrics = automations.map(automation => {
      const nodes = Array.isArray(automation.nodes) 
        ? automation.nodes 
        : (automation.nodes as any)?.nodes || []
      return {
        id: automation.id,
        name: automation.name,
        description: automation.description,
        triggerEvent: automation.triggerEvent,
        triggerData: automation.triggerData,
        applyToExisting: automation.applyToExisting,
        trackingEnabled: automation.trackingEnabled,
        nodes: automation.nodes,
        status: automation.status,
        totalEntered: automation.totalEntered,
        currentlyActive: automation.currentlyActive,
        totalCompleted: automation.totalCompleted,
        totalExecutions: automation._count.executions,
        activeExecutions: automation.executions.length,
        nodeCount: nodes.length,
        hasConditions: nodes.some((node: any) => node.type === 'condition'),
        createdAt: automation.createdAt,
        updatedAt: automation.updatedAt
      }
    })

    return NextResponse.json({
      success: true,
      automations: automationsWithMetrics,
      pagination: {
        limit,
        offset,
        total: automations.length
      }
    })

  } catch (error) {
    console.error('Error fetching automations:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch automations' 
    }, { status: 500 })
  }
}