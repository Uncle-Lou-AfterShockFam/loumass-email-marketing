const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function testAutomationFix() {
  const automationId = 'cmfbhe7sp0002jt048p8jux6p'
  
  console.log(`=== TESTING AUTOMATION FIXES ===`)
  console.log(`Automation ID: ${automationId}`)
  console.log(`Time: ${new Date().toISOString()}`)
  
  try {
    // Get the automation and its executions
    const automation = await prisma.automation.findUnique({
      where: { id: automationId },
      include: {
        executions: {
          include: {
            contact: {
              select: { email: true, firstName: true, lastName: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })
    
    if (!automation) {
      console.log('❌ Automation not found!')
      return
    }
    
    console.log(`✅ Automation: "${automation.name}" (${automation.status})`)
    console.log(`Total Executions: ${automation.executions.length}`)
    
    // Check execution states before processing
    console.log(`\n📊 EXECUTION STATES BEFORE FIX:`)
    automation.executions.forEach((exec, i) => {
      console.log(`  ${i+1}. ${exec.id} (${exec.contact.email})`)
      console.log(`     Status: ${exec.status}`)
      console.log(`     Current Node: ${exec.currentNodeId || 'NULL'}`)
      console.log(`     Wait Until: ${exec.waitUntil || 'None'}`)
    })
    
    // Call the automation executor manually to process executions
    console.log(`\n🚀 MANUALLY TRIGGERING AUTOMATION EXECUTOR...`)
    
    // Import the AutomationExecutor class
    const { AutomationExecutor } = require('./src/services/automation-executor.ts')
    const executor = new AutomationExecutor()
    
    // Process active executions
    await executor.executeAutomations()
    
    // Check execution states after processing
    console.log(`\n📊 CHECKING RESULTS AFTER PROCESSING...`)
    const updatedAutomation = await prisma.automation.findUnique({
      where: { id: automationId },
      include: {
        executions: {
          include: {
            contact: {
              select: { email: true, firstName: true, lastName: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })
    
    updatedAutomation.executions.forEach((exec, i) => {
      console.log(`  ${i+1}. ${exec.id} (${exec.contact.email})`)
      console.log(`     Status: ${exec.status}`)
      console.log(`     Current Node: ${exec.currentNodeId || 'NULL'}`)
      console.log(`     Wait Until: ${exec.waitUntil || 'None'}`)
      console.log(`     Updated: ${exec.updatedAt.toISOString()}`)
    })
    
    // Check for any email events created
    console.log(`\n📧 CHECKING FOR EMAIL EVENTS...`)
    const emailEvents = await prisma.emailEvent.findMany({
      where: {
        userId: automation.userId,
        timestamp: {
          gte: new Date(Date.now() - 60000) // Last minute
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 5
    })
    
    if (emailEvents.length > 0) {
      console.log(`✅ Found ${emailEvents.length} recent email events:`)
      emailEvents.forEach((event, i) => {
        console.log(`  ${i+1}. ${event.eventType} - ${event.contactEmail}`)
        console.log(`     Subject: "${event.subject || event.emailSubject || 'N/A'}"`)
        console.log(`     Time: ${event.timestamp.toISOString()}`)
      })
    } else {
      console.log(`ℹ️ No recent email events found`)
    }
    
    console.log(`\n🎯 TEST SUMMARY:`)
    console.log(`- Automation: ${automation.name}`)
    console.log(`- Status: ${automation.status}`)
    console.log(`- Executions processed: ${automation.executions.length}`)
    console.log(`- Recent email events: ${emailEvents.length}`)
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    console.error('Stack:', error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

testAutomationFix().catch(console.error)