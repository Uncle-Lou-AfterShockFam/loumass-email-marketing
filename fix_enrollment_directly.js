const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function fixEnrollmentDirectly() {
  const automationId = 'cmfbhe7sp0002jt048p8jux6p'
  
  console.log(`=== DIRECTLY FIXING ENROLLMENTS ===`)
  console.log(`Automation ID: ${automationId}`)
  console.log(`Time: ${new Date().toISOString()}`)
  
  try {
    // Get the automation to find the email node
    const automation = await prisma.automation.findUnique({
      where: { id: automationId }
    })
    
    if (!automation) {
      console.log('❌ Automation not found!')
      return
    }
    
    const flow = automation.nodes
    const emailNode = flow.nodes.find(n => n.type === 'email')
    
    if (!emailNode) {
      console.log('❌ No email node found!')
      return
    }
    
    console.log(`✅ Found email node: ${emailNode.id}`)
    
    // Get all active executions with null currentNodeId
    const brokenExecutions = await prisma.automationExecution.findMany({
      where: {
        automationId: automationId,
        status: { in: ['ACTIVE', 'FAILED'] },
        currentNodeId: null
      },
      include: {
        contact: {
          select: { email: true, firstName: true }
        }
      }
    })
    
    console.log(`Found ${brokenExecutions.length} broken executions to fix:`)
    
    // Fix each execution by setting currentNodeId to email node
    for (const execution of brokenExecutions) {
      console.log(`Fixing execution ${execution.id} for ${execution.contact.email}`)
      
      await prisma.automationExecution.update({
        where: { id: execution.id },
        data: {
          currentNodeId: emailNode.id,
          status: 'ACTIVE',
          failedAt: null,
          failureReason: null,
          updatedAt: new Date()
        }
      })
      
      console.log(`  ✅ Set currentNodeId to ${emailNode.id}`)
    }
    
    console.log(`\n🎯 FIXED ${brokenExecutions.length} executions`)
    console.log(`Next step: Run automation executor to process them`)
    
    // Update automation stats
    const activeCount = await prisma.automationExecution.count({
      where: {
        automationId: automationId,
        status: { in: ['ACTIVE', 'WAITING_UNTIL'] }
      }
    })
    
    await prisma.automation.update({
      where: { id: automationId },
      data: {
        currentlyActive: activeCount
      }
    })
    
    console.log(`Updated automation stats - ${activeCount} currently active`)
    
  } catch (error) {
    console.error('❌ Fix failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixEnrollmentDirectly().catch(console.error)