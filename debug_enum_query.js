const { PrismaClient, AutomationExecStatus } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function debugEnumQuery() {
  try {
    console.log('=== DEBUGGING ENUM QUERY ===')
    
    console.log('AutomationExecStatus.ACTIVE:', AutomationExecStatus.ACTIVE)
    console.log('AutomationExecStatus.WAITING_UNTIL:', AutomationExecStatus.WAITING_UNTIL)
    
    // Test the exact query from AutomationExecutor
    const readyExecutions = await prisma.automationExecution.findMany({
      where: {
        status: {
          in: [AutomationExecStatus.ACTIVE, AutomationExecStatus.WAITING_UNTIL]
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

    console.log(`Ready executions using enum: ${readyExecutions.length}`)
    
    if (readyExecutions.length > 0) {
      const exec = readyExecutions[0]
      console.log('Found execution:')
      console.log('  ID:', exec.id)
      console.log('  Status:', exec.status)
      console.log('  Automation:', exec.automation.name)
      console.log('  Contact:', exec.contact.email)
      console.log('  CurrentNodeId:', exec.currentNodeId)
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugEnumQuery()