const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function debugAutomationStructure() {
  const automationId = 'cmf5s5ns80002l504knusuw2u'
  console.log(`=== DEBUGGING AUTOMATION STRUCTURE FOR ${automationId} ===`)
  
  // Get the automation with full details
  const automation = await prisma.automation.findUnique({
    where: { id: automationId },
    select: {
      id: true,
      userId: true,
      name: true,
      status: true,
      triggerEvent: true,
      triggerData: true,
      nodes: true,
      totalEntered: true,
      currentlyActive: true,
      totalCompleted: true,
      createdAt: true,
      updatedAt: true
    }
  })
  
  if (!automation) {
    console.log("❌ Automation not found!")
    return
  }
  
  console.log("Automation Details:")
  console.log("- ID:", automation.id)
  console.log("- User ID:", automation.userId)
  console.log("- Name:", automation.name)
  console.log("- Status:", automation.status)
  console.log("- Trigger:", automation.triggerEvent)
  console.log("- Trigger Data:", JSON.stringify(automation.triggerData, null, 2))
  console.log("- Total Entered:", automation.totalEntered)
  console.log("- Currently Active:", automation.currentlyActive)
  console.log("- Total Completed:", automation.totalCompleted)
  console.log("- Created:", automation.createdAt)
  console.log("- Updated:", automation.updatedAt)
  
  console.log("\n=== AUTOMATION FLOW STRUCTURE ===")
  if (automation.nodes) {
    const flow = automation.nodes
    console.log("Flow Data Type:", typeof flow)
    console.log("Flow Keys:", Object.keys(flow))
    
    if (flow.nodes) {
      console.log(`\nNodes (${flow.nodes.length}):`)
      flow.nodes.forEach((node, index) => {
        console.log(`${index + 1}. Node ${node.id}:`)
        console.log(`   Type: ${node.type}`)
        console.log(`   Position: (${node.position?.x}, ${node.position?.y})`)
        if (node.data) {
          console.log(`   Data Keys: ${Object.keys(node.data)}`)
          if (node.data.label) {
            console.log(`   Label: ${node.data.label}`)
          }
          if (node.data.subject) {
            console.log(`   Subject: ${node.data.subject}`)
          }
          if (node.emailTemplate) {
            console.log(`   Has Email Template:`, !!node.emailTemplate)
            console.log(`   Template Subject: ${node.emailTemplate.subject}`)
          }
        }
        console.log(`   Full Node:`, JSON.stringify(node, null, 4))
      })
      
      console.log(`\nEdges (${flow.edges.length}):`)
      flow.edges.forEach((edge, index) => {
        console.log(`${index + 1}. Edge ${edge.id}: ${edge.source} → ${edge.target}`)
        if (edge.sourceHandle) {
          console.log(`   Source Handle: ${edge.sourceHandle}`)
        }
      })
    } else {
      console.log("No nodes found in automation flow!")
      console.log("Raw nodes data:", JSON.stringify(automation.nodes, null, 2))
    }
  } else {
    console.log("No flow data found!")
  }
  
  await prisma.$disconnect()
}

debugAutomationStructure().catch(console.error)