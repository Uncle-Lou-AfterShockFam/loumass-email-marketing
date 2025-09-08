const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function debugBrokenAutomation() {
  const automationId = 'cmfbhe7sp0002jt048p8jux6p'
  
  console.log(`=== DEBUGGING BROKEN AUTOMATION ===`)
  console.log(`Automation ID: ${automationId}`)
  console.log(`Time: ${new Date()}`)
  
  try {
    // Get the automation details
    const automation = await prisma.automation.findUnique({
      where: { id: automationId }
    })
    
    if (!automation) {
      console.log('❌ Automation not found!')
      return
    }
    
    console.log(`✅ Automation found: "${automation.name}"`)
    console.log(`Status: ${automation.status}`)
    console.log(`Trigger Event: ${automation.triggerEvent}`)
    console.log(`User ID: ${automation.userId}`)
    console.log(`Created: ${automation.createdAt}`)
    console.log(`Stats: ${automation.totalEntered} entered, ${automation.currentlyActive} active, ${automation.totalCompleted} completed`)
    
    // Check the nodes structure
    console.log(`\n🔍 NODES STRUCTURE:`)
    if (automation.nodes && automation.nodes.nodes) {
      console.log(`Total nodes: ${automation.nodes.nodes.length}`)
      console.log(`Total edges: ${automation.nodes.edges?.length || 0}`)
      
      automation.nodes.nodes.forEach(node => {
        console.log(`  - Node ${node.id}: ${node.type} (${node.name || 'Unnamed'})`)
        if (node.type === 'email' && node.emailTemplate) {
          console.log(`    Subject: "${node.emailTemplate.subject}"`)
          console.log(`    Content: "${node.emailTemplate.content?.substring(0, 50)}..."`)
        }
      })
      
      if (automation.nodes.edges) {
        automation.nodes.edges.forEach(edge => {
          console.log(`  - Edge: ${edge.source} -> ${edge.target}`)
        })
      }
    } else {
      console.log(`❌ NO NODES STRUCTURE FOUND!`)
    }
    
    // Check for executions
    console.log(`\n🚀 EXECUTIONS:`)
    const executions = await prisma.automationExecution.findMany({
      where: { automationId },
      include: {
        contact: {
          select: { email: true, firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`Found ${executions.length} executions:`)
    executions.forEach((exec, i) => {
      console.log(`  ${i+1}. Execution ${exec.id}`)
      console.log(`     Contact: ${exec.contact.firstName} ${exec.contact.lastName} (${exec.contact.email})`)
      console.log(`     Status: ${exec.status}`)
      console.log(`     Current Node: ${exec.currentNodeId || 'None'}`)
      console.log(`     Wait Until: ${exec.waitUntil || 'None'}`)
      console.log(`     Created: ${exec.createdAt}`)
      console.log(`     Updated: ${exec.updatedAt}`)
      if (exec.executionData) {
        console.log(`     Data: ${JSON.stringify(exec.executionData, null, 2)}`)
      }
    })
    
    // Check for email events (automationId field doesn't exist, use userId and recent time)
    console.log(`\n📧 EMAIL EVENTS:`)
    const emailEvents = await prisma.emailEvent.findMany({
      where: { 
        userId: automation.userId,
        timestamp: {
          gte: new Date(Date.now() - 3600000) // Last hour
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 10
    })
    
    console.log(`Found ${emailEvents.length} email events:`)
    emailEvents.forEach((event, i) => {
      console.log(`  ${i+1}. ${event.eventType} - ${event.timestamp}`)
      console.log(`     Contact: ${event.contactEmail}`)
      console.log(`     Subject: "${event.emailSubject}"`)
    })
    
    // Compare with working sequence
    console.log(`\n🔄 COMPARING WITH WORKING SEQUENCE...`)
    const workingSequence = await prisma.sequence.findFirst({
      where: { 
        userId: automation.userId,
        status: 'ACTIVE'
      }
    })
    
    if (workingSequence) {
      console.log(`Working Sequence: "${workingSequence.name}"`)
      console.log(`Sequence has ${workingSequence.steps?.length || 0} steps`)
      
      // Check sequence executions
      const seqExecutions = await prisma.sequenceExecution.findMany({
        where: { sequenceId: workingSequence.id },
        take: 3,
        orderBy: { createdAt: 'desc' }
      })
      console.log(`Sequence has ${seqExecutions.length} recent executions`)
      
      // Check sequence email events
      const seqEvents = await prisma.emailEvent.findMany({
        where: { sequenceId: workingSequence.id },
        take: 3,
        orderBy: { timestamp: 'desc' }
      })
      console.log(`Sequence has ${seqEvents.length} recent email events`)
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugBrokenAutomation().catch(console.error)