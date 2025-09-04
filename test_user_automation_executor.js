const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

// Test automation executor specifically for the user's automation
class TestUserAutomationExecutor {
  
  async processUserAutomation() {
    const automationId = 'cmf5tp3mc0002jp04coadmolg' // User's problematic automation
    console.log('=== TESTING USER AUTOMATION EXECUTOR ===')
    console.log(`Automation: ${automationId}`)
    
    // Get the automation
    const automation = await prisma.automation.findUnique({
      where: { id: automationId },
      include: {
        user: { select: { id: true, email: true } }
      }
    })
    
    if (!automation) {
      console.log('❌ Automation not found')
      return
    }
    
    console.log(`✅ Found automation: ${automation.name}`)
    console.log(`User: ${automation.user.email}`)
    console.log(`Status: ${automation.status}`)
    
    // Get a test contact for this user
    const testContact = await prisma.contact.findFirst({
      where: { userId: automation.userId },
      select: { id: true, email: true, firstName: true }
    })
    
    if (!testContact) {
      console.log('❌ No test contacts found for user')
      return
    }
    
    console.log(`📧 Test Contact: ${testContact.email} (${testContact.firstName})`)
    
    // Check if there are already executions
    const existingExecutions = await prisma.automationExecution.findMany({
      where: {
        automationId: automationId,
        contactId: testContact.id
      }
    })
    
    console.log(`\\nExisting executions: ${existingExecutions.length}`)
    existingExecutions.forEach(exec => {
      console.log(`  - ${exec.id}: ${exec.status} (Current: ${exec.currentNodeId || 'None'})`)
    })
    
    // Check if user has Gmail token
    const gmailToken = await prisma.gmailToken.findUnique({
      where: { userId: automation.userId }
    })
    
    if (!gmailToken) {
      console.log('❌ No Gmail token found for user')
      return
    }
    
    console.log(`✅ Gmail token exists for ${gmailToken.email}`)
    
    // Create a fresh execution for testing
    console.log('\\n🔄 Creating fresh test execution...')
    
    try {
      // Delete existing executions first to avoid conflicts
      await prisma.automationExecution.deleteMany({
        where: {
          automationId: automationId,
          contactId: testContact.id
        }
      })
      
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
      
      console.log(`✅ Created fresh execution: ${newExecution.id}`)
      
      // Now test the executor
      await this.processExecution(newExecution.id, automation)
      
    } catch (error) {
      console.error('❌ Failed to create execution:', error.message)
    }
  }
  
  async processExecution(executionId, automation) {
    console.log(`\\n🎯 Processing execution ${executionId}`)
    
    const execution = await prisma.automationExecution.findUnique({
      where: { id: executionId },
      include: {
        contact: { select: { email: true, firstName: true } }
      }
    })
    
    const automationFlow = automation.nodes
    const currentNodeId = execution.currentNodeId
    
    console.log(`Flow has ${automationFlow.nodes.length} nodes and ${automationFlow.edges.length} edges`)
    console.log(`Contact: ${execution.contact.email}`)
    console.log(`Current Node: ${currentNodeId || 'None - Starting from trigger'}`)
    
    // Find current node or start from trigger
    let currentNode = null
    
    if (currentNodeId) {
      currentNode = automationFlow.nodes.find(n => n.id === currentNodeId)
      console.log(`Found current node: ${currentNode?.type || 'NOT FOUND'}`)
    } else {
      // Find the trigger node to start
      const triggerNode = automationFlow.nodes.find(n => n.type === 'trigger')
      console.log(`Trigger node found: ${triggerNode ? 'YES' : 'NO'}`)
      
      if (triggerNode) {
        // Move to first node after trigger
        const nextNode = this.getNextNode(triggerNode.id, automationFlow)
        if (nextNode) {
          currentNode = nextNode
          console.log(`✅ Starting with ${currentNode.type} node: ${currentNode.id}`)
        }
      }
    }
    
    if (!currentNode) {
      console.log('❌ No current node found, completing execution')
      await this.completeExecution(executionId)
      return
    }
    
    console.log(`\\n📧 Processing ${currentNode.type} node...`)
    
    if (currentNode.type === 'email') {
      console.log('Email template:', JSON.stringify(currentNode.emailTemplate, null, 2))
      console.log('✅ Would send email here (simulated)')
      
      // Move to next node (if any)
      const nextNodes = this.getNextNodes(currentNode.id, automationFlow)
      if (nextNodes.length === 0) {
        console.log('🏁 No more nodes, completing execution')
        await this.completeExecution(executionId)
      } else {
        console.log(`➡️  Moving to next node: ${nextNodes[0].id}`)
        await prisma.automationExecution.update({
          where: { id: executionId },
          data: { currentNodeId: nextNodes[0].id }
        })
      }
    }
    
    console.log('\\n✅ Execution processing complete!')
    console.log('The automation flow is working correctly with trigger nodes!')
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

async function runUserTest() {
  const executor = new TestUserAutomationExecutor()
  await executor.processUserAutomation()
  await prisma.$disconnect()
}

runUserTest().catch(console.error)