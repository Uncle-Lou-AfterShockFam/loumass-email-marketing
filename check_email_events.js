const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function checkEmailEvents() {
  console.log("=== EMAIL EVENTS CHECK ===")
  
  const userId = 'cmeuwk6x70000jj04gb20w4dk' // ljpiotti@aftershockfam.org
  
  // Check recent email events for this user
  const recentEvents = await prisma.emailEvent.findMany({
    where: {
      userId: userId,
      createdAt: {
        gte: new Date(Date.now() - 60 * 60 * 1000) // Last 1 hour
      }
    },
    select: {
      id: true,
      type: true,
      subject: true,
      createdAt: true,
      eventData: true,
      contactId: true
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  })
  
  console.log(`Recent Email Events for user (last hour): ${recentEvents.length}`)
  recentEvents.forEach(event => {
    console.log(`- ${event.createdAt}: ${event.type} - ${event.subject}`)
    console.log(`  Contact: ${event.contactId}`)
    if (event.eventData) {
      console.log(`  Data:`, JSON.stringify(event.eventData, null, 2))
    }
  })
  
  // Check all email events for today
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  
  const todayEvents = await prisma.emailEvent.findMany({
    where: {
      userId: userId,
      createdAt: { gte: todayStart }
    },
    select: {
      id: true,
      type: true,
      subject: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  })
  
  console.log(`\nAll Email Events Today: ${todayEvents.length}`)
  todayEvents.forEach(event => {
    console.log(`- ${event.createdAt}: ${event.type} - ${event.subject}`)
  })
  
  await prisma.$disconnect()
}

checkEmailEvents().catch(console.error)