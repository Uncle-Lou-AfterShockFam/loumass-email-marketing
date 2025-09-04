const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function checkExecutions() {
  try {
    console.log('Checking current executions for automation...')
    
    const executions = await prisma.automationExecution.findMany({
      where: {
        automationId: 'cmf3gkfu00001l404moienepk'
      },
      include: {
        contact: {
          select: { email: true, firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`Found ${executions.length} executions:`)
    
    executions.forEach((exec, index) => {
      console.log(`${index + 1}. Contact: ${exec.contact.email}`)
      console.log(`   Status: ${exec.status}`)
      console.log(`   Current Node: ${exec.currentNodeId}`)
      console.log(`   Entered: ${exec.enteredAt}`)
      console.log(`   Wait Until: ${exec.waitUntil}`)
      console.log(`   Execution Data:`, exec.executionData)
      console.log(`   ---`)
    })
    
    // Check automation structure
    console.log('\nChecking automation structure...')
    const automation = await prisma.automation.findUnique({
      where: { id: 'cmf3gkfu00001l404moienepk' },
      select: { nodes: true, name: true }
    })
    
    if (automation?.nodes) {
      console.log('Automation nodes:', JSON.stringify(automation.nodes, null, 2))
    }
    
    // Check events
    console.log('\nChecking execution events...')
    const events = await prisma.automationExecutionEvent.findMany({
      where: {
        execution: {
          automationId: 'cmf3gkfu00001l404moienepk'
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 10
    })
    
    console.log(`Found ${events.length} events:`)
    events.forEach(event => {
      console.log(`- ${event.eventType} on node ${event.nodeId} at ${event.timestamp}`)
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkExecutions()