const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function debugAllExecutions() {
  try {
    console.log('=== ALL AUTOMATION EXECUTIONS ===')
    
    const allExecutions = await prisma.automationExecution.findMany({
      include: {
        automation: {
          select: { name: true, userId: true }
        },
        contact: {
          select: { email: true, firstName: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
    
    console.log(`Found ${allExecutions.length} executions:`)
    
    allExecutions.forEach((exec, index) => {
      console.log(`\n${index + 1}. Execution ID: ${exec.id}`)
      console.log(`   Automation: ${exec.automation.name} (${exec.automationId})`)
      console.log(`   User ID: ${exec.automation.userId}`)
      console.log(`   Contact: ${exec.contact.email} (${exec.contact.firstName})`)
      console.log(`   Status: ${exec.status}`)
      console.log(`   Current Node: ${exec.currentNodeId}`)
      console.log(`   Created: ${exec.createdAt}`)
      console.log(`   Started: ${exec.startedAt}`)
    })
    
    console.log('\n=== ACTIVE EXECUTIONS ONLY ===')
    
    const activeExecutions = await prisma.automationExecution.findMany({
      where: { status: 'ACTIVE' },
      include: {
        automation: {
          select: { name: true, userId: true, nodes: true }
        },
        contact: {
          select: { email: true, firstName: true }
        }
      }
    })
    
    console.log(`Found ${activeExecutions.length} ACTIVE executions:`)
    
    activeExecutions.forEach((exec, index) => {
      console.log(`\n${index + 1}. ACTIVE Execution: ${exec.id}`)
      console.log(`   Automation: ${exec.automation.name}`)
      console.log(`   Contact: ${exec.contact.email}`)
      console.log(`   Current Node: ${exec.currentNodeId}`)
      
      // Check if automation has email nodes
      const flow = exec.automation.nodes
      const emailNodes = flow.nodes?.filter(n => n.type === 'email') || []
      console.log(`   Email nodes in automation: ${emailNodes.length}`)
      emailNodes.forEach(node => {
        console.log(`     - ${node.id}: "${node.emailTemplate?.subject || 'No subject'}"`)
      })
    })
    
    console.log('\n=== RECENT EXECUTION EVENTS ===')
    
    const events = await prisma.automationExecutionEvent.findMany({
      take: 5,
      orderBy: { timestamp: 'desc' },
      include: {
        execution: {
          include: {
            automation: { select: { name: true } },
            contact: { select: { email: true } }
          }
        }
      }
    })
    
    console.log(`Found ${events.length} recent events:`)
    events.forEach(event => {
      console.log(`- ${event.eventType} on ${event.nodeId} at ${event.timestamp}`)
      console.log(`  Automation: ${event.execution.automation.name}`)
      console.log(`  Contact: ${event.execution.contact.email}`)
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugAllExecutions()