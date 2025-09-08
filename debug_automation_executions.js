const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function debugAutomationExecutions() {
  const automationId = 'cmf5vvi960001jr04faqaplk5'
  
  console.log(`=== DEBUGGING AUTOMATION EXECUTIONS ===`)
  console.log(`Automation ID: ${automationId}`)
  console.log(`Time: ${new Date()}`)
  
  // Get all executions for this automation
  const executions = await prisma.automationExecution.findMany({
    where: { automationId },
    include: {
      automation: true,
      contact: true
    },
    orderBy: { createdAt: 'desc' }
  })
  
  console.log(`\n📊 EXECUTIONS FOUND: ${executions.length}`)
  
  if (executions.length === 0) {
    console.log('❌ NO EXECUTIONS FOUND!')
    console.log('This means contacts haven\'t been enrolled yet.')
    
    // Check if automation is active
    const automation = await prisma.automation.findUnique({
      where: { id: automationId }
    })
    
    if (automation?.status === 'ACTIVE') {
      console.log('✅ Automation is ACTIVE')
      console.log('💡 Try manually enrolling contacts via the UI or API')
    }
    
    return
  }
  
  // Analyze each execution
  executions.forEach((execution, index) => {
    console.log(`\n--- EXECUTION ${index + 1} ---`)
    console.log(`ID: ${execution.id}`)
    console.log(`Contact: ${execution.contact.email}`)
    console.log(`Status: ${execution.status}`)
    console.log(`Current Node: ${execution.currentNodeId || 'null'}`)
    console.log(`Wait Until: ${execution.waitUntil || 'null'}`)
    console.log(`Started: ${execution.startedAt}`)
    console.log(`Completed: ${execution.completedAt || 'null'}`)
    console.log(`Failed: ${execution.failedAt || 'null'}`)
    console.log(`Failure Reason: ${execution.failureReason || 'null'}`)
    console.log(`Execution Data:`, JSON.stringify(execution.executionData, null, 2))
  })
  
  // Get execution events for debugging
  console.log(`\n🔍 EXECUTION EVENTS:`)
  const events = await prisma.automationExecutionEvent.findMany({
    where: {
      executionId: { in: executions.map(e => e.id) }
    },
    orderBy: { timestamp: 'desc' },
    take: 10
  })
  
  if (events.length === 0) {
    console.log('❌ NO EXECUTION EVENTS FOUND!')
  } else {
    events.forEach(event => {
      console.log(`- ${event.timestamp}: ${event.eventType} (Node: ${event.nodeId})`)
      if (event.eventData) {
        console.log(`  Data:`, JSON.stringify(event.eventData, null, 2))
      }
    })
  }
  
  // Check for email events
  console.log(`\n📧 EMAIL EVENTS:`)
  const emailEvents = await prisma.emailEvent.findMany({
    where: {
      eventData: {
        path: ['automationId'],
        equals: automationId
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  })
  
  if (emailEvents.length === 0) {
    console.log('❌ NO EMAIL EVENTS FOUND!')
    console.log('This means emails are not being sent successfully.')
  } else {
    console.log(`✅ ${emailEvents.length} EMAIL EVENTS FOUND:`)
    emailEvents.forEach(event => {
      console.log(`- ${event.createdAt}: ${event.type} to ${event.contact?.email || 'unknown'}`)
      console.log(`  Subject: ${event.subject}`)
      console.log(`  Details: ${event.details}`)
    })
  }
  
  await prisma.$disconnect()
}

debugAutomationExecutions().catch(console.error)