const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function debugSpecificAutomation() {
  const automationId = 'cmf5s5ns80002l504knusuw2u'
  console.log(`=== DEBUGGING AUTOMATION ${automationId} ===`)
  
  // Get automation details
  const automation = await prisma.automation.findUnique({
    where: { id: automationId },
    select: {
      id: true,
      userId: true,
      name: true,
      status: true,
      triggerEvent: true,
      nodes: true,
      totalEntered: true,
      currentlyActive: true,
      totalCompleted: true,
      createdAt: true,
      updatedAt: true
    }
  })
  
  if (!automation) {
    console.log("❌ Automation not found!")
    return
  }
  
  console.log("Automation Details:")
  console.log("- ID:", automation.id)
  console.log("- User ID:", automation.userId)
  console.log("- Name:", automation.name)
  console.log("- Status:", automation.status)
  console.log("- Trigger:", automation.triggerEvent)
  console.log("- Total Entered:", automation.totalEntered)
  console.log("- Currently Active:", automation.currentlyActive)
  console.log("- Total Completed:", automation.totalCompleted)
  console.log("- Created:", automation.createdAt)
  console.log("- Updated:", automation.updatedAt)
  
  // Check executions for this automation
  const executions = await prisma.automationExecution.findMany({
    where: { automationId: automationId },
    select: {
      id: true,
      contactId: true,
      status: true,
      currentNodeId: true,
      enteredAt: true,
      completedAt: true,
      failedAt: true,
      failureReason: true,
      executionData: true
    },
    orderBy: { enteredAt: 'desc' }
  })
  
  console.log(`\nAutomation Executions: ${executions.length}`)
  executions.forEach(exec => {
    console.log(`- Execution ${exec.id}:`)
    console.log(`  Contact: ${exec.contactId}`)
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
  
  // Check email events related to this automation
  const emailEvents = await prisma.emailEvent.findMany({
    where: {
      OR: [
        { 
          eventData: {
            path: ['automationId'],
            equals: automationId
          }
        },
        {
          subject: {
            contains: automation.name
          }
        }
      ]
    },
    select: {
      id: true,
      type: true,
      subject: true,
      createdAt: true,
      contactId: true,
      eventData: true
    },
    orderBy: { createdAt: 'desc' }
  })
  
  console.log(`\nEmail Events for this automation: ${emailEvents.length}`)
  emailEvents.forEach(event => {
    console.log(`- ${event.createdAt}: ${event.type} - ${event.subject}`)
    console.log(`  Contact: ${event.contactId}`)
    if (event.eventData) {
      console.log(`  Event Data:`, JSON.stringify(event.eventData, null, 2))
    }
  })
  
  // Check automation node stats
  const nodeStats = await prisma.automationNodeStats.findMany({
    where: { automationId: automationId },
    select: {
      nodeId: true,
      totalPassed: true,
      currentPassed: true,
      inNode: true,
      lastUpdated: true
    }
  })
  
  console.log(`\nNode Statistics: ${nodeStats.length}`)
  nodeStats.forEach(stat => {
    console.log(`- Node ${stat.nodeId}: Total=${stat.totalPassed}, Current=${stat.currentPassed}, InNode=${stat.inNode}, Updated=${stat.lastUpdated}`)
  })
  
  // Check contacts that should be in this automation
  if (executions.length > 0) {
    const contactIds = executions.map(e => e.contactId)
    const contacts = await prisma.contact.findMany({
      where: { id: { in: contactIds } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true
      }
    })
    
    console.log(`\nContacts in automation executions: ${contacts.length}`)
    contacts.forEach(contact => {
      console.log(`- ${contact.id}: ${contact.email} (${contact.firstName} ${contact.lastName}) - Status: ${contact.status}`)
    })
  }
  
  await prisma.$disconnect()
}

debugSpecificAutomation().catch(console.error)