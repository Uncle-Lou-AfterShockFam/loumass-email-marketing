const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkLjpiottiExecution() {
  try {
    console.log('=== LJPIOTTI EXECUTION CHECK ===')
    
    // Find ljpiotti contact
    const ljpiottiContact = await prisma.contact.findFirst({
      where: {
        email: 'ljpiotti@gmail.com'
      }
    })
    
    if (!ljpiottiContact) {
      console.log('❌ ljpiotti@gmail.com contact not found')
      return
    }
    
    console.log(`✅ Found contact: ${ljpiottiContact.email} (${ljpiottiContact.id})`)
    
    // Find all executions for this contact
    const executions = await prisma.automationExecution.findMany({
      where: {
        contactId: ljpiottiContact.id
      },
      include: {
        automation: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log(`\n📊 Total executions for ljpiotti@gmail.com: ${executions.length}`)
    
    executions.forEach((execution, index) => {
      console.log(`\nExecution ${index + 1}:`)
      console.log(`  ID: ${execution.id}`)
      console.log(`  Automation: ${execution.automation.name}`)
      console.log(`  Status: ${execution.status}`)
      console.log(`  Current Node: ${execution.currentNodeId || 'null'}`)
      console.log(`  Started: ${execution.startedAt}`)
      console.log(`  Completed: ${execution.completedAt || 'null'}`)
      console.log(`  Created: ${execution.createdAt}`)
      console.log(`  Updated: ${execution.updatedAt}`)
    })
    
    // Check email events for this contact
    const emailEvents = await prisma.emailEvent.findMany({
      where: {
        contactId: ljpiottiContact.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })
    
    console.log(`\n📧 Email events for ljpiotti@gmail.com: ${emailEvents.length}`)
    
    emailEvents.forEach((event, index) => {
      console.log(`\nEvent ${index + 1}:`)
      console.log(`  Type: ${event.type}`)
      console.log(`  Subject: ${event.subject}`)
      console.log(`  Timestamp: ${event.timestamp}`)
      console.log(`  Created: ${event.createdAt}`)
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkLjpiottiExecution()