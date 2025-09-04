const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function checkFinalResults() {
  try {
    console.log('=== FINAL AUTOMATION RESULTS ===')
    
    // Check all executions
    const executions = await prisma.automationExecution.findMany({
      include: {
        automation: true,
        contact: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`\nTotal executions: ${executions.length}`)
    
    executions.forEach((exec, i) => {
      console.log(`\nExecution ${i+1}:`)
      console.log('  ID:', exec.id)
      console.log('  Automation:', exec.automation.name)
      console.log('  Contact:', exec.contact.email)
      console.log('  Status:', exec.status)
      console.log('  Current Node:', exec.currentNodeId)
      console.log('  Started:', exec.startedAt)
      console.log('  Completed:', exec.completedAt)
      console.log('  Execution Data:', JSON.stringify(exec.executionData, null, 2))
    })
    
    // Check email events
    console.log('\n=== EMAIL EVENTS ===')
    const emailEvents = await prisma.emailEvent.findMany({
      include: {
        contact: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
    
    console.log(`Recent email events: ${emailEvents.length}`)
    
    emailEvents.forEach((event, i) => {
      console.log(`\nEmail Event ${i+1}:`)
      console.log('  Type:', event.type)
      console.log('  Subject:', event.subject)
      console.log('  Contact:', event.contact.email)
      console.log('  Details:', event.details)
      console.log('  Created:', event.createdAt)
      if (event.eventData) {
        console.log('  Event Data:', JSON.stringify(event.eventData, null, 2))
      }
    })
    
    // Check automation execution events
    console.log('\n=== AUTOMATION EXECUTION EVENTS ===')
    const executionEvents = await prisma.automationExecutionEvent.findMany({
      orderBy: { timestamp: 'desc' },
      take: 10
    })
    
    console.log(`Recent execution events: ${executionEvents.length}`)
    
    executionEvents.forEach((event, i) => {
      console.log(`\nExecution Event ${i+1}:`)
      console.log('  Type:', event.eventType)
      console.log('  Node ID:', event.nodeId)
      console.log('  Timestamp:', event.timestamp)
      console.log('  Event Data:', JSON.stringify(event.eventData, null, 2))
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkFinalResults()