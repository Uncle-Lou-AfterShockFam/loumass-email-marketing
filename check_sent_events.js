const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function checkSentEvents() {
  const automationId = 'cmf5s5ns80002l504knusuw2u'
  console.log(`=== CHECKING SENT EMAIL EVENTS FOR AUTOMATION ${automationId} ===`)
  
  // Check for SENT type events today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const sentEvents = await prisma.emailEvent.findMany({
    where: {
      type: 'SENT',
      createdAt: { gte: today },
      userId: 'cmeuwk6x70000jj04gb20w4dk'
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
  
  console.log(`SENT Events Today for User: ${sentEvents.length}`)
  sentEvents.forEach(event => {
    console.log(`- ${event.createdAt}: ${event.subject}`)
    console.log(`  Contact: ${event.contactId}`)
    if (event.eventData) {
      console.log(`  Event Data:`, JSON.stringify(event.eventData, null, 2))
    }
  })
  
  // Check specifically for events with automation ID in eventData
  const automationEvents = await prisma.emailEvent.findMany({
    where: {
      eventData: {
        path: ['automationId'],
        equals: automationId
      }
    },
    select: {
      id: true,
      type: true,
      subject: true,
      createdAt: true,
      contactId: true,
      eventData: true
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  })
  
  console.log(`\nEvents with this automation ID in eventData: ${automationEvents.length}`)
  automationEvents.forEach(event => {
    console.log(`- ${event.createdAt}: ${event.type} - ${event.subject}`)
    console.log(`  Contact: ${event.contactId}`)
    if (event.eventData) {
      console.log(`  Event Data:`, JSON.stringify(event.eventData, null, 2))
    }
  })
  
  await prisma.$disconnect()
}

checkSentEvents().catch(console.error)