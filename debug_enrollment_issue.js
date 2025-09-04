const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function debugEnrollmentIssue() {
  const automationId = 'cmf5tp3mc0002jp04coadmolg'
  const targetEmail = 'ljpiotti@polarispathways.com'
  
  console.log(`=== DEBUGGING ENROLLMENT ISSUE ===`)
  console.log(`Automation: ${automationId}`)
  console.log(`Target Contact: ${targetEmail}`)
  
  // 1. Check if contact exists
  const contact = await prisma.contact.findFirst({
    where: { 
      email: targetEmail 
    },
    include: {
      user: { select: { email: true } }
    }
  })
  
  if (!contact) {
    console.log('❌ Contact not found in database!')
    console.log('This could be why enrollment failed.')
    return
  }
  
  console.log(`✅ Contact found: ${contact.firstName} ${contact.lastName}`)
  console.log(`Contact belongs to user: ${contact.user.email}`)
  console.log(`Contact ID: ${contact.id}`)
  
  // 2. Check recent executions for this contact
  const executions = await prisma.automationExecution.findMany({
    where: {
      automationId: automationId,
      contactId: contact.id
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  })
  
  console.log(`\\n📊 Executions for this contact:`)
  console.log(`Total executions: ${executions.length}`)
  
  executions.forEach(exec => {
    console.log(`  - ${exec.id}: ${exec.status} (Node: ${exec.currentNodeId || 'None'}) - ${exec.createdAt}`)
  })
  
  // 3. Check automation status
  const automation = await prisma.automation.findUnique({
    where: { id: automationId }
  })
  
  console.log(`\\n🎯 Automation Status: ${automation.status}`)
  console.log(`Trigger Event: ${automation.triggerEvent}`)
  
  // 4. Check if there are any pending executions that need processing
  const pendingExecutions = await prisma.automationExecution.findMany({
    where: {
      automationId: automationId,
      status: { in: ['ACTIVE', 'WAITING_UNTIL'] },
      OR: [
        { waitUntil: null },
        { waitUntil: { lte: new Date() } }
      ]
    }
  })
  
  console.log(`\\n⏳ Pending executions that need processing: ${pendingExecutions.length}`)
  
  pendingExecutions.forEach(exec => {
    console.log(`  - ${exec.id}: ${exec.status} (Contact: ${exec.contactId})`)
  })
  
  // 5. Check recent email events
  const recentEmails = await prisma.emailEvent.findMany({
    where: {
      recipientEmail: targetEmail
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  })
  
  console.log(`\\n📧 Recent email events for ${targetEmail}:`)
  console.log(`Total email events: ${recentEmails.length}`)
  
  recentEmails.forEach(event => {
    console.log(`  - ${event.eventType}: ${event.subject || 'No subject'} - ${event.createdAt}`)
  })
  
  // 6. If there's a recent execution that's ACTIVE, try processing it
  const activeExecution = executions.find(e => e.status === 'ACTIVE')
  if (activeExecution) {
    console.log(`\\n🔄 Found ACTIVE execution: ${activeExecution.id}`)
    console.log('This execution should be processed by the automation engine')
    console.log('Let me manually trigger the automation processor...')
    
    // Check what node it's on
    console.log(`Current node: ${activeExecution.currentNodeId || 'Starting from trigger'}`)
  }
  
  await prisma.$disconnect()
}

debugEnrollmentIssue().catch(console.error)