const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function checkStatus() {
  console.log("=== CHECKING AUTOMATION STATUS ===")
  
  // Check Gmail token
  const gmailToken = await prisma.gmailToken.findFirst({
    where: { userId: 'cmevnl4ub00008oy13oo09459' },
    select: { email: true, expiresAt: true }
  })
  
  console.log("Gmail Token:")
  console.log("Email:", gmailToken?.email)
  console.log("Expires At:", gmailToken?.expiresAt)
  console.log("Is Expired:", gmailToken ? gmailToken.expiresAt < new Date() : 'No token')
  
  // Check recent email events
  const recentEvents = await prisma.emailEvent.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
      }
    },
    select: {
      id: true,
      userId: true,
      contactId: true,
      type: true,
      subject: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  })
  
  console.log("\nRecent Email Events (last 10 minutes):", recentEvents.length)
  recentEvents.forEach(event => {
    console.log(`- ${event.type}: ${event.subject} (${event.createdAt})`)
  })
  
  // Check automation executions
  const executions = await prisma.automationExecution.findMany({
    where: {
      automation: { userId: 'cmevnl4ub00008oy13oo09459' }
    },
    select: {
      id: true,
      automationId: true,
      contactId: true,
      status: true,
      currentNodeId: true,
      updatedAt: true
    },
    orderBy: { updatedAt: 'desc' },
    take: 5
  })
  
  console.log("\nRecent Automation Executions:")
  executions.forEach(exec => {
    console.log(`- ${exec.id}: Status=${exec.status}, Node=${exec.currentNodeId}, Updated=${exec.updatedAt}`)
  })
  
  await prisma.$disconnect()
}

checkStatus().catch(console.error)