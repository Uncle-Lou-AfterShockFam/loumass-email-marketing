const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function checkUserAutomation() {
  const automationId = 'cmf5tp3mc0002jp04coadmolg'
  console.log(`=== CHECKING USER'S PROBLEMATIC AUTOMATION ${automationId} ===`)
  
  // Check the automation structure
  const automation = await prisma.automation.findUnique({
    where: { id: automationId },
    include: {
      executions: {
        select: {
          id: true,
          status: true,
          contactId: true,
          currentNodeId: true,
          createdAt: true
        }
      }
    }
  })
  
  if (!automation) {
    console.log('❌ Automation not found')
    return
  }
  
  console.log(`✅ Found automation: ${automation.name}`)
  console.log(`Status: ${automation.status}`)
  console.log(`Trigger: ${automation.triggerEvent}`)
  
  const flow = automation.nodes
  console.log(`\\n📊 Current Flow Structure:`)
  
  if (flow.nodes && flow.edges) {
    console.log(`- Nodes: ${flow.nodes.length}`)
    console.log(`- Edges: ${flow.edges.length}`)
    
    flow.nodes.forEach(node => {
      console.log(`  - ${node.type} node: ${node.id}`)
    })
    
    if (flow.edges.length > 0) {
      flow.edges.forEach(edge => {
        console.log(`  - Edge: ${edge.source} → ${edge.target}`)
      })
    } else {
      console.log('  ❌ NO EDGES FOUND!')
    }
  } else {
    console.log('❌ Invalid flow structure - missing nodes/edges')
  }
  
  console.log(`\\n📈 Execution History:`)
  console.log(`Total executions: ${automation.executions.length}`)
  
  automation.executions.forEach(exec => {
    console.log(`  - ${exec.id}: ${exec.status} (Node: ${exec.currentNodeId || 'None'})`)
  })
  
  // Check if it has trigger node
  const hasTrigger = flow.nodes && flow.nodes.some(n => n.type === 'trigger')
  console.log(`\\n🎯 Has trigger node: ${hasTrigger ? 'YES' : 'NO'}`)
  
  if (!hasTrigger) {
    console.log('\\n🔧 FIXING: Adding trigger node and edges...')
    
    // Add trigger node
    const triggerNode = {
      id: `trigger-${Date.now()}`,
      type: 'trigger',
      name: 'Automation Start',
      position: { x: 50, y: 100 },
      data: {
        label: 'Automation Start',
        triggerType: automation.triggerEvent
      }
    }
    
    // Add trigger at the beginning
    flow.nodes.unshift(triggerNode)
    
    // Connect trigger to first user-created node
    if (flow.nodes.length > 1) {
      const firstUserNode = flow.nodes[1]
      if (!flow.edges) flow.edges = []
      flow.edges.push({
        id: `trigger-to-${firstUserNode.id}`,
        source: triggerNode.id,
        target: firstUserNode.id,
        type: 'smoothstep'
      })
    }
    
    // Update in database
    await prisma.automation.update({
      where: { id: automationId },
      data: { nodes: flow }
    })
    
    console.log('✅ Fixed! Automation now has trigger node and proper edges')
    console.log(`New structure: ${flow.nodes.length} nodes, ${flow.edges.length} edges`)
  }
  
  await prisma.$disconnect()
}

checkUserAutomation().catch(console.error)