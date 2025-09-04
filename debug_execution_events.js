const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function debugExecutionEvents() {
  const automationId = 'cmf5s5ns80002l504knusuw2u'
  console.log(`=== DEBUGGING EXECUTION EVENTS FOR AUTOMATION ${automationId} ===`)
  
  // Get all execution events for this automation
  const events = await prisma.automationExecutionEvent.findMany({
    where: {
      execution: {
        automationId: automationId
      }
    },
    select: {
      id: true,
      executionId: true,
      nodeId: true,
      eventType: true,
      eventData: true,
      timestamp: true
    },
    orderBy: { timestamp: 'asc' }
  })
  
  console.log(`Execution Events: ${events.length}`)
  events.forEach(event => {
    console.log(`- ${event.timestamp}: ${event.eventType} on Node ${event.nodeId}`)
    console.log(`  Execution: ${event.executionId}`)
    if (event.eventData) {
      console.log(`  Data:`, JSON.stringify(event.eventData, null, 2))
    }
  })
  
  // Check if there are any automation execution logs
  const executionLogs = await prisma.automationExecution.findMany({
    where: { automationId: automationId },
    select: {
      id: true,
      status: true,
      currentNodeId: true,
      enteredAt: true,
      completedAt: true,
      failedAt: true,
      failureReason: true,
      executionData: true
    }
  })
  
  console.log(`\nExecution Details:`)
  executionLogs.forEach(exec => {
    console.log(`- Execution ${exec.id}:`)
    console.log(`  Status: ${exec.status}`)
    console.log(`  Current Node: ${exec.currentNodeId}`)
    console.log(`  Entered: ${exec.enteredAt}`)
    console.log(`  Completed: ${exec.completedAt}`)
    console.log(`  Failed: ${exec.failedAt}`)
    console.log(`  Failure Reason: ${exec.failureReason}`)
    if (exec.executionData) {
      console.log(`  Execution Data:`, JSON.stringify(exec.executionData, null, 2))
    }
  })
  
  await prisma.$disconnect()
}

debugExecutionEvents().catch(console.error)