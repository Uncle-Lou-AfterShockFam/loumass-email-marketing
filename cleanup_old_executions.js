const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function cleanupOldExecutions() {
  try {
    const newAutomationId = 'cmf576mbc0001ib049ovss2vy'  // Our target automation
    const oldAutomationId = 'cmf3gkfu00001l404moienepk'   // Old automation causing issues
    
    console.log('1. Checking executions before cleanup...')
    
    const allExecutions = await prisma.automationExecution.findMany({
      include: {
        automation: { select: { name: true, id: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`Total executions: ${allExecutions.length}`)
    
    const newAutomationExecs = allExecutions.filter(e => e.automationId === newAutomationId)
    const oldAutomationExecs = allExecutions.filter(e => e.automationId === oldAutomationId)
    
    console.log(`New automation executions: ${newAutomationExecs.length}`)
    console.log(`Old automation executions: ${oldAutomationExecs.length}`)
    
    console.log('\n2. Our target execution (NEW automation):')
    newAutomationExecs.forEach(exec => {
      console.log(`   ID: ${exec.id}`)
      console.log(`   Status: ${exec.status}`)
      console.log(`   Current Node: ${exec.currentNodeId}`)
      console.log(`   Contact ID: ${exec.contactId}`)
    })
    
    console.log('\n3. Cleaning up OLD automation executions...')
    console.log('These have currentNodeId: null and no proper flow structure')
    
    for (const exec of oldAutomationExecs) {
      console.log(`Deleting execution ${exec.id} (status: ${exec.status}, node: ${exec.currentNodeId})`)
    }
    
    // Delete old automation executions
    const deletedCount = await prisma.automationExecution.deleteMany({
      where: {
        automationId: oldAutomationId
      }
    })
    
    console.log(`✅ Deleted ${deletedCount.count} old executions`)
    
    console.log('\n4. Checking remaining executions...')
    
    const remainingExecutions = await prisma.automationExecution.findMany({
      include: {
        automation: { select: { name: true } },
        contact: { select: { email: true } }
      }
    })
    
    console.log(`Remaining executions: ${remainingExecutions.length}`)
    remainingExecutions.forEach(exec => {
      console.log(`   ${exec.id}: ${exec.automation.name} -> ${exec.contact.email} (${exec.status}, node: ${exec.currentNodeId})`)
    })
    
    console.log('\n5. Ready to test! The NEW automation execution should now process.')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupOldExecutions()