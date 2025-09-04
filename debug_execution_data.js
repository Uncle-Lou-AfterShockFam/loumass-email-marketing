const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function debugExecutionData() {
  try {
    console.log('=== DEBUG EXECUTION DATA ===')
    
    // Get all contacts
    const contacts = await prisma.contact.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true
      }
    })
    
    console.log(`\n📋 All contacts in system: ${contacts.length}`)
    contacts.forEach((contact, index) => {
      console.log(`  ${index + 1}. ${contact.email} (${contact.id})`)
    })
    
    // Get specific execution from check results
    const execution = await prisma.automationExecution.findFirst({
      where: {
        id: 'cmf58w9uk0000jm04tgu8c533'
      },
      include: {
        contact: true,
        automation: {
          select: { name: true }
        }
      }
    })
    
    if (execution) {
      console.log(`\n🔍 Execution Details:`)
      console.log(`  ID: ${execution.id}`)
      console.log(`  Contact ID: ${execution.contactId}`)
      console.log(`  Contact: ${execution.contact ? execution.contact.email : 'MISSING'}`)
      console.log(`  Status: ${execution.status}`)
      console.log(`  Current Node: ${execution.currentNodeId}`)
      console.log(`  Automation: ${execution.automation.name}`)
    } else {
      console.log('❌ Execution not found')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugExecutionData()