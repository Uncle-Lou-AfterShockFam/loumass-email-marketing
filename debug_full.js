const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function debugFull() {
  console.log("=== FULL DATABASE DEBUG ===")
  
  // Check all users
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true }
  })
  console.log("Users in database:", users.length)
  users.forEach(user => {
    console.log(`- ${user.id}: ${user.email} (${user.name})`)
  })
  
  // Check Gmail tokens for all users
  const gmailTokens = await prisma.gmailToken.findMany({
    select: { userId: true, email: true, expiresAt: true }
  })
  console.log("\nGmail Tokens:", gmailTokens.length)
  gmailTokens.forEach(token => {
    console.log(`- User: ${token.userId}, Email: ${token.email}, Expires: ${token.expiresAt}`)
  })
  
  // Check all automations
  const automations = await prisma.automation.findMany({
    select: { 
      id: true, 
      userId: true, 
      name: true, 
      status: true,
      totalEntered: true,
      currentlyActive: true
    }
  })
  console.log("\nAutomations:", automations.length)
  automations.forEach(auto => {
    console.log(`- ${auto.id}: ${auto.name} (Status: ${auto.status}, Entered: ${auto.totalEntered}, Active: ${auto.currentlyActive})`)
  })
  
  // Check all automation executions
  const executions = await prisma.automationExecution.findMany({
    select: {
      id: true,
      automationId: true,
      contactId: true,
      status: true,
      currentNodeId: true,
      updatedAt: true
    }
  })
  console.log("\nAutomation Executions:", executions.length)
  executions.forEach(exec => {
    console.log(`- ${exec.id}: Auto=${exec.automationId}, Contact=${exec.contactId}, Status=${exec.status}, Node=${exec.currentNodeId}`)
  })
  
  await prisma.$disconnect()
}

debugFull().catch(console.error)