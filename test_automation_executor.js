const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

// Simplified automation executor for testing
class TestAutomationExecutor {
  
  async processExecutions() {
    const automationId = 'cmf5s5ns80002l504knusuw2u'
    console.log('=== TESTING AUTOMATION EXECUTOR ===')
    
    // Get executions that need processing
    const readyExecutions = await prisma.automationExecution.findMany({
      where: {
        automationId: automationId,
        status: { in: ['ACTIVE', 'WAITING_UNTIL'] },
        OR: [
          { waitUntil: null },
          { waitUntil: { lte: new Date() } }
        ]
      },
      include: {
        automation: true,
        contact: true
      }
    })
    
    console.log(`Found ${readyExecutions.length} ready executions`)
    
    for (const execution of readyExecutions) {
      console.log(`\n🔄 Processing execution ${execution.id}`)
      console.log(`Contact: ${execution.contact.email} (${execution.contact.firstName})`)
      console.log(`Current Node: ${execution.currentNodeId}`)
      
      await this.processExecution(execution)
    }
  }
  
  async processExecution(execution) {
    const automationFlow = execution.automation.nodes
    const currentNodeId = execution.currentNodeId
    
    console.log(`Flow has ${automationFlow.nodes.length} nodes and ${automationFlow.edges.length} edges`)
    
    // Find current node or start from trigger
    let currentNode = null
    
    if (currentNodeId) {
      currentNode = automationFlow.nodes.find(n => n.id === currentNodeId) || null
      console.log(`Found current node: ${currentNode?.type || 'NOT FOUND'}`)
    } else {
      console.log('No current node, looking for trigger...')
      // Find the trigger node to start
      const triggerNode = automationFlow.nodes.find(n => n.type === 'trigger')
      console.log(`Trigger node found: ${triggerNode ? 'YES' : 'NO'}`)
      
      if (triggerNode) {
        console.log(`Trigger node ID: ${triggerNode.id}`)
        // Move to first node after trigger
        const nextNode = this.getNextNode(triggerNode.id, automationFlow)
        console.log(`Next node after trigger: ${nextNode ? nextNode.type : 'NONE'}`)
        if (nextNode) {
          currentNode = nextNode
          console.log(`✅ Starting with ${currentNode.type} node: ${currentNode.id}`)
        }
      }
    }
    
    if (!currentNode) {
      console.log('❌ No current node found, completing execution')
      await this.completeExecution(execution.id)
      return
    }
    
    console.log(`📧 Processing ${currentNode.type} node...`)
    
    if (currentNode.type === 'email') {
      // Simulate email processing
      console.log('Email template:', JSON.stringify(currentNode.emailTemplate, null, 2))
      
      // Check if user has Gmail token
      const gmailToken = await prisma.gmailToken.findUnique({
        where: { userId: execution.automation.userId }
      })
      
      if (!gmailToken) {
        console.log('❌ No Gmail token found')
        return
      }
      
      console.log(`✅ Gmail token exists for ${gmailToken.email}`)
      console.log('✅ Would send email here (simulated)')
      
      // Simulate creating email event
      console.log('📝 Creating email event...')
      
      // Move to next node (if any)
      const nextNodes = this.getNextNodes(currentNode.id, automationFlow)
      if (nextNodes.length === 0) {
        console.log('🏁 No more nodes, completing execution')
        await this.completeExecution(execution.id)
      } else {
        console.log(`➡️  Moving to next node: ${nextNodes[0].id}`)
        await prisma.automationExecution.update({
          where: { id: execution.id },
          data: { currentNodeId: nextNodes[0].id }
        })
      }
    }
  }
  
  getNextNode(nodeId, flow) {
    const nextNodes = this.getNextNodes(nodeId, flow)
    return nextNodes.length > 0 ? nextNodes[0] : null
  }
  
  getNextNodes(nodeId, flow) {
    const edges = flow.edges.filter(edge => edge.source === nodeId)
    return edges
      .map(edge => flow.nodes.find(n => n.id === edge.target))
      .filter(Boolean)
  }
  
  async completeExecution(executionId) {
    console.log(`✅ Completing execution ${executionId}`)
    await prisma.automationExecution.update({
      where: { id: executionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    })
  }
}

async function runTest() {
  const executor = new TestAutomationExecutor()
  await executor.processExecutions()
  await prisma.$disconnect()
}

runTest().catch(console.error)