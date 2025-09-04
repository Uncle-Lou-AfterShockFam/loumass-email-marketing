const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function resetAndTest() {
  const automationId = 'cmf5s5ns80002l504knusuw2u'
  console.log('=== RESETTING EXECUTION FOR TESTING ===')
  
  // Get one completed execution and reset it to ACTIVE
  const execution = await prisma.automationExecution.findFirst({
    where: { automationId: automationId },
    include: { contact: true, automation: true }
  })
  
  if (!execution) {
    console.log('❌ No execution found')
    return
  }
  
  console.log(`Found execution for contact: ${execution.contact.email}`)
  
  // Reset execution to ACTIVE with no currentNodeId (so it starts from trigger)
  await prisma.automationExecution.update({
    where: { id: execution.id },
    data: {
      status: 'ACTIVE',
      currentNodeId: null,
      completedAt: null,
      waitUntil: null,
      startedAt: new Date()
    }
  })
  
  console.log('✅ Reset execution to ACTIVE status')
  console.log('📍 Current node: null (will start from trigger)')
  
  // Now test the execution flow manually
  await testExecutionFlow(execution)
  
  await prisma.$disconnect()
}

async function testExecutionFlow(execution) {
  console.log('\n=== TESTING EXECUTION FLOW ===')
  
  const automationFlow = execution.automation.nodes
  console.log(`Flow: ${automationFlow.nodes.length} nodes, ${automationFlow.edges.length} edges`)
  
  // Step 1: Find trigger node
  const triggerNode = automationFlow.nodes.find(n => n.type === 'trigger')
  console.log(`1. Trigger node: ${triggerNode ? triggerNode.id : 'NOT FOUND'}`)
  
  if (!triggerNode) {
    console.log('❌ No trigger node found!')
    return
  }
  
  // Step 2: Find next node after trigger
  const edges = automationFlow.edges.filter(edge => edge.source === triggerNode.id)
  console.log(`2. Edges from trigger: ${edges.length}`)
  
  if (edges.length === 0) {
    console.log('❌ No edges from trigger!')
    return
  }
  
  const nextNodeId = edges[0].target
  const nextNode = automationFlow.nodes.find(n => n.id === nextNodeId)
  console.log(`3. Next node after trigger: ${nextNode ? nextNode.type : 'NOT FOUND'} (${nextNodeId})`)
  
  if (nextNode && nextNode.type === 'email') {
    console.log('4. 📧 Email node found!')
    console.log('   Subject:', nextNode.emailTemplate?.subject)
    console.log('   Content preview:', nextNode.emailTemplate?.content?.substring(0, 50) + '...')
    
    // Check Gmail token
    const gmailToken = await prisma.gmailToken.findUnique({
      where: { userId: execution.automation.userId }
    })
    
    if (gmailToken) {
      console.log('5. ✅ Gmail token exists - emails CAN be sent')
      console.log('   From:', gmailToken.email)
      
      // This is where the actual email would be processed
      console.log('🚀 READY TO SEND EMAIL!')
      console.log('   To:', execution.contact.email)
      console.log('   Subject:', nextNode.emailTemplate?.subject?.replace('{{firstName}}', execution.contact.firstName || ''))
      
    } else {
      console.log('5. ❌ No Gmail token - emails CANNOT be sent')
    }
  }
}

resetAndTest().catch(console.error)