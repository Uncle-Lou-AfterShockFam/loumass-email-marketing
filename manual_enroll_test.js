const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function manualEnrollTest() {
  try {
    console.log('=== MANUAL ENROLLMENT TEST ===')
    
    const automationId = 'cmf576mbc0001ib049ovss2vy'
    const contactId = 'cmeyw26jv0001jp04pvu8grr1' // lou@soberafe.com
    
    // Delete existing execution to start fresh
    const existing = await prisma.automationExecution.findFirst({
      where: { automationId: automationId }
    })
    
    if (existing) {
      console.log('Deleting existing execution:', existing.id)
      await prisma.automationExecution.delete({
        where: { id: existing.id }
      })
    }
    
    // Create a new execution that starts at the email node (not trigger)
    console.log('Creating fresh execution starting at email node...')
    
    const newExecution = await prisma.automationExecution.create({
      data: {
        automationId,
        contactId,
        status: 'ACTIVE',
        currentNodeId: 'email-1756977687861', // Start directly at email node
        executionData: { variables: {} },
        enteredAt: new Date(),
        startedAt: new Date()
      }
    })
    
    console.log('✅ Created new execution:', newExecution.id)
    console.log('   Contact ID:', contactId)
    console.log('   Current Node:', newExecution.currentNodeId)
    console.log('   Status:', newExecution.status)
    
    // Update automation stats
    await prisma.automation.update({
      where: { id: automationId },
      data: {
        totalEntered: { increment: 1 },
        currentlyActive: { increment: 1 }
      }
    })
    
    console.log('✅ Updated automation stats')
    console.log('\nReady to test email sending!')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

manualEnrollTest()