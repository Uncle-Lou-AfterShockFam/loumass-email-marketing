const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function testEnrollment() {
  try {
    console.log('1. Checking automation status...')
    const automation = await prisma.automation.findUnique({
      where: { id: 'cmf3gkfu00001l404moienepk' },
      select: {
        id: true,
        name: true,
        status: true,
        userId: true,
        totalEntered: true,
        currentlyActive: true,
        totalCompleted: true
      }
    })
    
    console.log('Automation:', automation)
    
    if (!automation) {
      console.log('❌ Automation not found')
      return
    }
    
    console.log('2. Checking user contacts...')
    const contacts = await prisma.contact.findMany({
      where: { userId: automation.userId },
      select: { id: true, email: true, firstName: true, lastName: true },
      take: 5
    })
    
    console.log('Available contacts:', contacts)
    
    if (contacts.length === 0) {
      console.log('❌ No contacts found for user')
      return
    }
    
    console.log('3. Checking existing executions...')
    const existingExecutions = await prisma.automationExecution.findMany({
      where: {
        automationId: 'cmf3gkfu00001l404moienepk',
        contactId: contacts[0].id
      }
    })
    
    console.log('Existing executions for first contact:', existingExecutions)
    
    console.log('4. Testing manual enrollment...')
    
    if (automation.status !== 'ACTIVE') {
      console.log('⚠️ Automation is not active, status:', automation.status)
      return
    }
    
    // Try to create an execution manually
    const testContactId = contacts[0].id
    console.log('Creating execution for contact:', testContactId)
    
    const execution = await prisma.automationExecution.create({
      data: {
        automationId: 'cmf3gkfu00001l404moienepk',
        contactId: testContactId,
        status: 'ACTIVE',
        executionData: { variables: {} },
        enteredAt: new Date(),
        startedAt: new Date()
      }
    })
    
    console.log('✅ Created execution:', execution.id)
    
    // Update automation stats
    await prisma.automation.update({
      where: { id: 'cmf3gkfu00001l404moienepk' },
      data: {
        totalEntered: { increment: 1 },
        currentlyActive: { increment: 1 }
      }
    })
    
    console.log('✅ Updated automation stats')
    
    // Check final stats
    const finalAutomation = await prisma.automation.findUnique({
      where: { id: 'cmf3gkfu00001l404moienepk' },
      select: {
        totalEntered: true,
        currentlyActive: true,
        totalCompleted: true
      }
    })
    
    console.log('Final automation stats:', finalAutomation)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testEnrollment()