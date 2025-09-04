const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function checkSimpleResults() {
  try {
    console.log('=== CHECKING AUTOMATION RESULTS ===')
    
    // Check the current execution
    const execution = await prisma.automationExecution.findFirst({
      where: {
        automationId: 'cmf576mbc0001ib049ovss2vy'
      },
      include: {
        automation: true,
        contact: true
      }
    })
    
    if (execution) {
      console.log('\nCurrent execution:')
      console.log('  ID:', execution.id)
      console.log('  Status:', execution.status)
      console.log('  Current Node:', execution.currentNodeId)
      console.log('  Contact:', execution.contact.email)
      console.log('  Started:', execution.startedAt)
      console.log('  Completed:', execution.completedAt)
      console.log('  Execution Data:', JSON.stringify(execution.executionData, null, 2))
    } else {
      console.log('No execution found for automation cmf576mbc0001ib049ovss2vy')
    }
    
    // Check recent email events 
    const emailEvents = await prisma.emailEvent.count()
    console.log('\nTotal email events in database:', emailEvents)
    
    // Check automation execution events
    const executionEvents = await prisma.automationExecutionEvent.findMany({
      orderBy: { timestamp: 'desc' },
      take: 5
    })
    
    console.log('\nRecent automation execution events:', executionEvents.length)
    
    executionEvents.forEach((event, i) => {
      console.log(`  Event ${i+1}: ${event.eventType} on node ${event.nodeId} at ${event.timestamp}`)
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSimpleResults()