const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function finalStatusCheck() {
  try {
    console.log('=== FINAL AUTOMATION STATUS ===')
    
    // Get all current executions
    const allExecutions = await prisma.automationExecution.findMany({
      include: {
        contact: { select: { email: true } },
        automation: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`\n📊 Total executions in system: ${allExecutions.length}`)
    
    const statusCounts = {}
    allExecutions.forEach(execution => {
      statusCounts[execution.status] = (statusCounts[execution.status] || 0) + 1
    })
    
    console.log('\n📈 Status breakdown:')
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`)
    })
    
    // Show recent executions
    console.log('\n📋 Recent executions (last 5):')
    allExecutions.slice(0, 5).forEach((execution, index) => {
      console.log(`\n${index + 1}. ${execution.automation.name} → ${execution.contact ? execution.contact.email : 'MISSING_CONTACT'}`)
      console.log(`   Status: ${execution.status}`)
      console.log(`   Started: ${execution.startedAt}`)
      console.log(`   Completed: ${execution.completedAt || 'In progress'}`)
    })
    
    // Count ready executions (what the executor would process)
    const now = new Date()
    const readyExecutions = await prisma.automationExecution.findMany({
      where: {
        status: { in: ['ACTIVE', 'WAITING'] },
        OR: [
          { waitUntil: null },
          { waitUntil: { lte: now } }
        ]
      }
    })
    
    console.log(`\n⚡ Ready executions (would be processed): ${readyExecutions.length}`)
    
    // Check recent email events
    const recentEvents = await prisma.emailEvent.findMany({
      include: {
        contact: { select: { email: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    })
    
    console.log(`\n📧 Recent email events: ${recentEvents.length}`)
    recentEvents.forEach((event, index) => {
      console.log(`\n${index + 1}. ${event.contact ? event.contact.email : 'UNKNOWN'}: "${event.subject}"`)
      console.log(`   Type: ${event.type}`)
      console.log(`   Sent: ${event.createdAt}`)
    })
    
    console.log('\n✅ SUMMARY:')
    console.log(`   - Total executions: ${allExecutions.length}`)
    console.log(`   - Ready to process: ${readyExecutions.length}`)
    console.log(`   - Recent emails sent: ${recentEvents.length}`)
    console.log(`   - System status: ${readyExecutions.length === 0 ? '🟢 All caught up!' : '🟡 Processing needed'}`)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

finalStatusCheck()