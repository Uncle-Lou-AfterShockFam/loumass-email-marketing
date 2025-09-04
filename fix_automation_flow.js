const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function fixAutomationFlow() {
  const automationId = 'cmf5s5ns80002l504knusuw2u'
  console.log(`=== FIXING AUTOMATION FLOW FOR ${automationId} ===`)
  
  // Get current automation
  const automation = await prisma.automation.findUnique({
    where: { id: automationId }
  })
  
  if (!automation) {
    console.log("❌ Automation not found!")
    return
  }
  
  const currentFlow = automation.nodes
  console.log("Current nodes:", currentFlow.nodes.length)
  console.log("Current edges:", currentFlow.edges.length)
  
  // Create the fixed flow with trigger node and proper edges
  const fixedFlow = {
    nodes: [
      // Add trigger node
      {
        id: "trigger-manual",
        name: "Manual Trigger",
        type: "trigger",
        position: { x: 100, y: 171 },
        data: {
          label: "Manual Trigger",
          triggerType: "MANUAL"
        }
      },
      // Keep existing email node
      currentFlow.nodes[0]
    ],
    edges: [
      // Connect trigger to email node
      {
        id: "trigger-to-email",
        source: "trigger-manual",
        target: currentFlow.nodes[0].id,
        type: "smoothstep"
      }
    ]
  }
  
  console.log("New structure:")
  console.log("- Nodes:", fixedFlow.nodes.length)
  console.log("- Edges:", fixedFlow.edges.length)
  
  // Update the automation
  await prisma.automation.update({
    where: { id: automationId },
    data: {
      nodes: fixedFlow,
      updatedAt: new Date()
    }
  })
  
  console.log("✅ Automation flow fixed!")
  console.log("Now the flow should work: trigger → email node")
  
  await prisma.$disconnect()
}

fixAutomationFlow().catch(console.error)