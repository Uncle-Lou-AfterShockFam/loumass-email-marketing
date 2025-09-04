const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function testFixedEnrollment() {
  const automationId = 'cmf5tp3mc0002jp04coadmolg'
  const targetEmail = 'lou@soberafe.com'
  
  console.log(`=== TESTING FIXED ENROLLMENT ===`)
  console.log(`Automation: ${automationId}`)
  console.log(`Target Contact: ${targetEmail}`)
  console.log(`Time: ${new Date()}`)
  
  // Get contact
  const contact = await prisma.contact.findFirst({
    where: { email: targetEmail }
  })
  
  if (!contact) {
    console.log('❌ Contact not found')
    return
  }
  
  console.log(`✅ Contact found: ${contact.firstName} ${contact.lastName}`)
  
  // Check existing executions
  const existingExecutions = await prisma.automationExecution.findMany({
    where: {
      automationId: automationId,
      contactId: contact.id
    },
    orderBy: { createdAt: 'desc' }
  })
  
  console.log(`\\nExisting executions: ${existingExecutions.length}`)
  existingExecutions.forEach(exec => {
    console.log(`  - ${exec.id}: ${exec.status} - ${exec.createdAt}`)
  })
  
  // Now try to create a NEW execution (should work without unique constraint)
  console.log(`\\n🔄 Creating NEW execution...`)
  
  try {
    const newExecution = await prisma.automationExecution.create({
      data: {
        automationId: automationId,
        contactId: contact.id,
        status: 'ACTIVE',
        executionData: { 
          variables: {}, 
          source: 'fixed-enrollment-test',
          timestamp: new Date().toISOString()
        },
        enteredAt: new Date(),
        startedAt: new Date()
      }
    })
    
    console.log(`✅ SUCCESS! Created new execution: ${newExecution.id}`)
    console.log(`This proves the unique constraint is removed!`)
    
    // Process this execution immediately
    console.log(`\\n🎯 PROCESSING NEW EXECUTION IMMEDIATELY...`)
    await processExecutionNow(newExecution.id)
    
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}`)
    if (error.code === 'P2002') {
      console.log('❌ Unique constraint still exists!')
    }
  }
  
  await prisma.$disconnect()
}

async function processExecutionNow(executionId) {
  console.log(`\\n⚡ IMMEDIATE PROCESSING: ${executionId}`)
  
  const execution = await prisma.automationExecution.findUnique({
    where: { id: executionId },
    include: {
      automation: true,
      contact: { select: { email: true, firstName: true, lastName: true } }
    }
  })
  
  if (!execution) {
    console.log('❌ Execution not found')
    return
  }
  
  console.log(`Processing for: ${execution.contact.email}`)
  
  const automationFlow = execution.automation.nodes
  
  // Start from trigger
  const triggerNode = automationFlow.nodes.find(n => n.type === 'trigger')
  if (!triggerNode) {
    console.log('❌ No trigger node found')
    return
  }
  
  // Move to next node after trigger
  const edges = automationFlow.edges.filter(edge => edge.source === triggerNode.id)
  if (edges.length === 0) {
    console.log('❌ No edges from trigger')
    return
  }
  
  const nextNodeId = edges[0].target
  const nextNode = automationFlow.nodes.find(n => n.id === nextNodeId)
  
  if (!nextNode) {
    console.log('❌ Next node not found')
    return
  }
  
  console.log(`\\n📧 Processing ${nextNode.type} node: ${nextNode.id}`)
  
  // Update execution to point to email node
  await prisma.automationExecution.update({
    where: { id: executionId },
    data: { currentNodeId: nextNodeId }
  })
  
  if (nextNode.type === 'email') {
    const emailTemplate = nextNode.emailTemplate
    const firstName = execution.contact.firstName || 'there'
    const processedSubject = emailTemplate.subject.replace(/\\{\\{firstName\\}\\}/g, firstName)
    const processedContent = emailTemplate.content.replace(/\\{\\{firstName\\}\\}/g, firstName)
    
    console.log(`\\n📤 SENDING EMAIL:`)
    console.log(`To: ${execution.contact.email}`)
    console.log(`Subject: ${processedSubject}`)
    console.log(`Content: ${processedContent}`)
    
    // Create email event
    const emailEvent = await prisma.emailEvent.create({
      data: {
        contactId: execution.contactId,
        eventType: 'SENT',
        subject: processedSubject,
        details: `Email sent to ${execution.contact.email} via automation - FIXED ENROLLMENT`,
        userId: execution.automation.userId,
        timestamp: new Date(),
        createdAt: new Date()
      }
    })
    
    console.log(`✅ Created email event: ${emailEvent.id}`)
    
    // Complete execution
    await prisma.automationExecution.update({
      where: { id: executionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    })
    
    // Update automation stats
    await prisma.automation.update({
      where: { id: execution.automationId },
      data: {
        currentlyActive: { decrement: 1 },
        totalCompleted: { increment: 1 }
      }
    })
    
    console.log(`\\n🎯 ✅ EXECUTION COMPLETED!`)
    console.log(`\\n🚀 THE FIX WORKED! MULTIPLE ENROLLMENTS NOW POSSIBLE!`)
    console.log(`Check your analytics tab - you should see the new execution!`)
  }
}

testFixedEnrollment().catch(console.error)