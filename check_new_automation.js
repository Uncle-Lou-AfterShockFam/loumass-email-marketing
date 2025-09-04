const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function checkNewAutomation() {
  try {
    const automationId = 'cmf576mbc0001ib049ovss2vy'
    
    console.log('1. Checking automation details...')
    const automation = await prisma.automation.findUnique({
      where: { id: automationId },
      include: {
        user: {
          select: { id: true, email: true, name: true }
        }
      }
    })
    
    if (!automation) {
      console.log('❌ Automation not found!')
      return
    }
    
    console.log('Automation found:', {
      id: automation.id,
      name: automation.name,
      status: automation.status,
      triggerEvent: automation.triggerEvent,
      totalEntered: automation.totalEntered,
      currentlyActive: automation.currentlyActive,
      totalCompleted: automation.totalCompleted,
      userId: automation.userId,
      user: automation.user
    })
    
    console.log('Automation nodes:', JSON.stringify(automation.nodes, null, 2))
    
    console.log('\n2. Checking contact lou@soberafe.com...')
    const contact = await prisma.contact.findFirst({
      where: {
        email: 'lou@soberafe.com',
        userId: automation.userId
      }
    })
    
    if (!contact) {
      console.log('❌ Contact lou@soberafe.com not found for this user!')
      
      // Check if contact exists for other users
      const otherContacts = await prisma.contact.findMany({
        where: { email: 'lou@soberafe.com' },
        include: {
          user: {
            select: { id: true, email: true }
          }
        }
      })
      
      console.log('Contact exists for other users:', otherContacts)
      return
    }
    
    console.log('Contact found:', {
      id: contact.id,
      email: contact.email,
      firstName: contact.firstName,
      lastName: contact.lastName,
      userId: contact.userId
    })
    
    console.log('\n3. Checking existing executions...')
    const executions = await prisma.automationExecution.findMany({
      where: {
        automationId: automationId,
        contactId: contact.id
      },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`Found ${executions.length} executions for this contact:`)
    executions.forEach((exec, index) => {
      console.log(`${index + 1}. ID: ${exec.id}`)
      console.log(`   Status: ${exec.status}`)
      console.log(`   Current Node: ${exec.currentNodeId}`)
      console.log(`   Created: ${exec.createdAt}`)
      console.log(`   Entered: ${exec.enteredAt}`)
      console.log(`   Started: ${exec.startedAt}`)
      console.log(`   Wait Until: ${exec.waitUntil}`)
      console.log(`   Execution Data:`, exec.executionData)
      console.log('   ---')
    })
    
    console.log('\n4. Checking execution events...')
    const events = await prisma.automationExecutionEvent.findMany({
      where: {
        execution: {
          automationId: automationId,
          contactId: contact.id
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 10
    })
    
    console.log(`Found ${events.length} events:`)
    events.forEach(event => {
      console.log(`- ${event.eventType} on node ${event.nodeId} at ${event.timestamp}`)
      if (event.eventData) {
        console.log(`  Data:`, event.eventData)
      }
    })
    
    console.log('\n5. Checking user Gmail tokens...')
    const gmailTokens = await prisma.gmailToken.findMany({
      where: { userId: automation.userId },
      select: {
        id: true,
        email: true,
        expiresAt: true,
        createdAt: true
      }
    })
    
    console.log('Gmail tokens:', gmailTokens)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkNewAutomation()