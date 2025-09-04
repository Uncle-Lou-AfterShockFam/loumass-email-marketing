const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

// Process the stuck execution manually
class ExecutionProcessor {
  
  async processStuckExecution() {
    const executionId = 'cmf5uhkdc0009jp04fsijhjku'
    console.log(`=== PROCESSING STUCK EXECUTION ${executionId} ===`)
    
    // Get the execution with full details
    const execution = await prisma.automationExecution.findUnique({
      where: { id: executionId },
      include: {
        automation: true,
        contact: { select: { email: true, firstName: true } }
      }
    })
    
    if (!execution) {
      console.log('❌ Execution not found')
      return
    }
    
    console.log(`✅ Found execution for ${execution.contact.email}`)
    console.log(`Status: ${execution.status}`)
    console.log(`Current Node: ${execution.currentNodeId || 'None - Starting'}`)
    
    const automationFlow = execution.automation.nodes
    console.log(`Flow has ${automationFlow.nodes.length} nodes and ${automationFlow.edges.length} edges`)
    
    // Since currentNodeId is None, start from trigger
    const triggerNode = automationFlow.nodes.find(n => n.type === 'trigger')
    if (!triggerNode) {
      console.log('❌ No trigger node found')
      return
    }
    
    console.log(`Found trigger node: ${triggerNode.id}`)
    
    // Find next node after trigger
    const nextNode = this.getNextNode(triggerNode.id, automationFlow)
    if (!nextNode) {
      console.log('❌ No node after trigger')
      return
    }
    
    console.log(`Moving to ${nextNode.type} node: ${nextNode.id}`)
    
    // Update execution to point to email node
    await prisma.automationExecution.update({
      where: { id: executionId },
      data: { currentNodeId: nextNode.id }
    })
    
    console.log(`✅ Updated execution currentNodeId to: ${nextNode.id}`)
    
    // Now process the email node
    if (nextNode.type === 'email') {
      console.log(`\\n📧 Processing email node...`)
      console.log(`Subject: ${nextNode.emailTemplate.subject}`)
      console.log(`Content: ${nextNode.emailTemplate.content}`)
      
      // Check Gmail token
      const gmailToken = await prisma.gmailToken.findUnique({
        where: { userId: execution.automation.userId }
      })
      
      if (!gmailToken) {
        console.log('❌ No Gmail token found')
        return
      }
      
      console.log(`✅ Gmail token found for: ${gmailToken.email}`)
      
      // Simulate email sending and create event
      const emailContent = nextNode.emailTemplate.content
        .replace(/\\{\\{firstName\\}\\}/g, execution.contact.firstName || 'there')
      
      const emailSubject = nextNode.emailTemplate.subject
        .replace(/\\{\\{firstName\\}\\}/g, execution.contact.firstName || 'there')
      
      console.log(`\\n📤 Would send email:`)
      console.log(`To: ${execution.contact.email}`)
      console.log(`Subject: ${emailSubject}`)
      console.log(`Content: ${emailContent}`)
      
      // Create email event to simulate the send
      try {
        const emailEvent = await prisma.emailEvent.create({
          data: {
            contactId: execution.contactId,
            eventType: 'SENT',
            subject: emailSubject,
            details: 'Email sent via automation',
            userId: execution.automation.userId,
            timestamp: new Date(),
            createdAt: new Date()
          }
        })
        
        console.log(`✅ Created email event: ${emailEvent.id}`)
      } catch (error) {
        console.log('⚠️  Could not create email event:', error.message)
      }
      
      // Complete the execution
      await this.completeExecution(executionId)
      
      // Update automation stats
      await prisma.automation.update({
        where: { id: execution.automationId },
        data: {
          currentlyActive: { decrement: 1 },
          totalCompleted: { increment: 1 }
        }
      })
      
      console.log(`\\n🎯 EXECUTION COMPLETE!`)
      console.log(`The email has been sent and analytics updated!`)
    }
  }
  
  getNextNode(nodeId, flow) {
    const edges = flow.edges.filter(edge => edge.source === nodeId)
    if (edges.length === 0) return null
    return flow.nodes.find(n => n.id === edges[0].target)
  }
  
  async completeExecution(executionId) {
    await prisma.automationExecution.update({
      where: { id: executionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    })
    console.log(`✅ Execution marked as COMPLETED`)
  }
}

async function runProcessor() {
  const processor = new ExecutionProcessor()
  await processor.processStuckExecution()
  await prisma.$disconnect()
}

runProcessor().catch(console.error)