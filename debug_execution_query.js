const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function debugExecutionQuery() {
  try {
    console.log('=== DEBUGGING EXECUTION QUERY ===')
    
    // First, check all executions
    const allExecutions = await prisma.automationExecution.findMany({
      include: {
        automation: true,
        contact: true
      }
    })
    
    console.log(`Total executions: ${allExecutions.length}`)
    
    allExecutions.forEach((exec, index) => {
      console.log(`Execution ${index + 1}:`)
      console.log('  ID:', exec.id)
      console.log('  Status:', exec.status)
      console.log('  Automation:', exec.automation.name)
      console.log('  Contact:', exec.contact.email)
      console.log('  CurrentNodeId:', exec.currentNodeId)
      console.log('  WaitUntil:', exec.waitUntil)
      console.log()
    })
    
    // Now check the exact query from AutomationExecutor
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

    console.log(`Ready executions (AutomationExecutor query): ${readyExecutions.length}`)
    
    if (readyExecutions.length > 0) {
      readyExecutions.forEach((exec, index) => {
        console.log(`Ready Execution ${index + 1}:`)
        console.log('  ID:', exec.id)
        console.log('  Status:', exec.status)
        console.log('  Automation:', exec.automation.name)
        console.log('  Contact:', exec.contact.email)
        console.log('  CurrentNodeId:', exec.currentNodeId)
        console.log('  WaitUntil:', exec.waitUntil)
        console.log()
      })
    }
    
    console.log('Current time:', new Date())
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugExecutionQuery()