const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function testFixedAutomation() {
  const automationId = 'cmf5s5ns80002l504knusuw2u'
  console.log(`=== TESTING FIXED AUTOMATION ${automationId} ===`)
  
  // First, verify the structure is fixed
  const automation = await prisma.automation.findUnique({
    where: { id: automationId }
  })
  
  const flow = automation.nodes
  console.log("✅ Fixed Flow Structure:")
  console.log(`- Nodes: ${flow.nodes.length}`)
  console.log(`- Edges: ${flow.edges.length}`)
  
  flow.nodes.forEach(node => {
    console.log(`  - ${node.type} node: ${node.id}`)
  })
  
  flow.edges.forEach(edge => {
    console.log(`  - Edge: ${edge.source} → ${edge.target}`)
  })
  
  // Get a test contact
  const testContact = await prisma.contact.findFirst({
    where: { userId: automation.userId },
    select: { id: true, email: true, firstName: true }
  })
  
  if (!testContact) {
    console.log("❌ No test contacts found")
    return
  }
  
  console.log(`\n📧 Test Contact: ${testContact.email} (${testContact.firstName})`)
  
  // Manually enroll the contact for testing
  console.log("🔄 Enrolling test contact...")
  
  const newExecution = await prisma.automationExecution.create({
    data: {
      automationId: automationId,
      contactId: testContact.id,
      status: 'ACTIVE',
      executionData: { variables: {} },
      enteredAt: new Date(),
      startedAt: new Date()
    }
  })
  
  console.log(`✅ Created execution: ${newExecution.id}`)
  
  // Update automation stats
  await prisma.automation.update({
    where: { id: automationId },
    data: {
      totalEntered: { increment: 1 },
      currentlyActive: { increment: 1 }
    }
  })
  
  console.log("🎯 Automation execution created successfully!")
  console.log("Next: The cron job should process this execution and send the email")
  console.log("Check email events after running automation processor")
  
  await prisma.$disconnect()
}

testFixedAutomation().catch(console.error)