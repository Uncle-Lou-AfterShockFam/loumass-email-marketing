const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

// Simplified test to check if the AutomationExecutor would process the execution
async function testAutomationExecution() {
  try {
    console.log('=== TESTING AUTOMATION EXECUTION ===')
    
    // Get the ready executions (same logic as AutomationExecutor)
    const readyExecutions = await prisma.automationExecution.findMany({
      where: {
        status: {
          in: ['ACTIVE', 'WAITING_UNTIL']
        },
        OR: [
          { waitUntil: null }, // No delay
          { waitUntil: { lte: new Date() } } // Delay has passed
        ]
      },
      include: {
        automation: true,
        contact: true
      },
      take: 100
    })

    console.log(`Found ${readyExecutions.length} ready executions`)

    if (readyExecutions.length > 0) {
      const execution = readyExecutions[0]
      console.log('First execution details:')
      console.log('  ID:', execution.id)
      console.log('  Automation:', execution.automation.name)
      console.log('  Contact:', execution.contact.email)
      console.log('  Current Node:', execution.currentNodeId)
      console.log('  Status:', execution.status)
      
      // Check the automation flow
      const flow = execution.automation.nodes
      console.log('  Flow nodes:', flow.nodes?.length || 0)
      
      if (flow.nodes) {
        const emailNode = flow.nodes.find(n => n.type === 'email')
        if (emailNode) {
          console.log('  Email node found:')
          console.log('    ID:', emailNode.id)
          if (emailNode.emailTemplate) {
            console.log('    Subject:', emailNode.emailTemplate.subject)
            console.log('    HTML Content length:', emailNode.emailTemplate.htmlContent?.length || 0)
            console.log('    Text Content length:', emailNode.emailTemplate.textContent?.length || 0)
          }
        }
      }
    } else {
      console.log('No ready executions found')
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAutomationExecution()