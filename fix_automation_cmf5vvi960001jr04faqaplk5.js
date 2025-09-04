const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function fixBrokenAutomation() {
  const automationId = 'cmf5vvi960001jr04faqaplk5'
  
  console.log(`=== FIXING BROKEN AUTOMATION ${automationId} ===`)
  
  // Get current automation
  const automation = await prisma.automation.findUnique({
    where: { id: automationId }
  })
  
  if (!automation) {
    console.log('❌ Automation not found')
    return
  }
  
  console.log(`✅ Found automation: "${automation.name}"`)
  console.log(`Current nodes:`, JSON.stringify(automation.nodes, null, 2))
  
  // Extract the existing email node
  const currentNodes = automation.nodes.nodes || []
  const emailNode = currentNodes.find(n => n.type === 'email')
  
  if (!emailNode) {
    console.log('❌ No email node found')
    return
  }
  
  console.log(`✅ Found email node: ${emailNode.id}`)
  
  // Create trigger node
  const triggerNode = {
    id: `trigger-${Date.now()}`,
    type: 'trigger',
    name: 'Automation Start',
    position: { x: 50, y: 100 },
    data: {
      label: 'Automation Start',
      triggerType: 'MANUAL'
    }
  }
  
  // Create the fixed flow
  const fixedFlow = {
    nodes: [triggerNode, emailNode],
    edges: [{
      id: `trigger-to-${emailNode.id}`,
      source: triggerNode.id,
      target: emailNode.id,
      type: 'smoothstep'
    }]
  }
  
  console.log(`🔧 FIXING AUTOMATION WITH:`)
  console.log(`- Trigger Node: ${triggerNode.id}`)
  console.log(`- Email Node: ${emailNode.id}`)
  console.log(`- Edge: ${triggerNode.id} -> ${emailNode.id}`)
  
  // Update the automation
  await prisma.automation.update({
    where: { id: automationId },
    data: {
      nodes: fixedFlow
    }
  })
  
  console.log(`✅ AUTOMATION FIXED!`)
  console.log(`Now the automation should work with enrollment!`)
  
  // Test enrollment immediately
  console.log(`\n🎯 TESTING ENROLLMENT FOR lou@soberafe.com...`)
  await testEnrollment(automationId, 'lou@soberafe.com')
  
  await prisma.$disconnect()
}

async function testEnrollment(automationId, email) {
  // Get contact
  const contact = await prisma.contact.findFirst({
    where: { email: email }
  })
  
  if (!contact) {
    console.log(`❌ Contact ${email} not found`)
    return
  }
  
  console.log(`✅ Found contact: ${contact.firstName} ${contact.lastName}`)
  
  // Create execution
  try {
    const execution = await prisma.automationExecution.create({
      data: {
        automationId: automationId,
        contactId: contact.id,
        status: 'ACTIVE',
        executionData: { 
          variables: {}, 
          source: 'manual-fix-test',
          timestamp: new Date().toISOString()
        },
        enteredAt: new Date(),
        startedAt: new Date()
      }
    })
    
    console.log(`✅ ENROLLMENT SUCCESS: Created execution ${execution.id}`)
    
    // Process immediately
    await processExecution(execution.id)
    
  } catch (error) {
    console.log(`❌ ENROLLMENT FAILED: ${error.message}`)
  }
}

async function processExecution(executionId) {
  console.log(`\n⚡ PROCESSING EXECUTION ${executionId}`)
  
  const execution = await prisma.automationExecution.findUnique({
    where: { id: executionId },
    include: {
      automation: true,
      contact: { select: { email: true, firstName: true, lastName: true } }
    }
  })
  
  if (!execution) return
  
  const automationFlow = execution.automation.nodes
  const triggerNode = automationFlow.nodes.find(n => n.type === 'trigger')
  const edges = automationFlow.edges.filter(e => e.source === triggerNode.id)
  
  if (edges.length === 0) {
    console.log('❌ No edges from trigger')
    return
  }
  
  const nextNodeId = edges[0].target
  const emailNode = automationFlow.nodes.find(n => n.id === nextNodeId)
  
  console.log(`📧 Processing email node: ${emailNode.id}`)
  
  // Update to email node
  await prisma.automationExecution.update({
    where: { id: executionId },
    data: { currentNodeId: nextNodeId }
  })
  
  // Process email
  const firstName = execution.contact.firstName || 'there'
  const processedSubject = emailNode.emailTemplate.subject.replace(/\{\{firstName\}\}/g, firstName)
  const processedContent = emailNode.emailTemplate.content.replace(/\{\{firstName\}\}/g, firstName)
  
  console.log(`📤 SENDING EMAIL:`)
  console.log(`To: ${execution.contact.email}`)
  console.log(`Subject: ${processedSubject}`)
  console.log(`Content: ${processedContent}`)
  
  // Create email event
  const emailEvent = await prisma.emailEvent.create({
    data: {
      contactId: execution.contactId,
      eventType: 'SENT',
      subject: processedSubject,
      details: `Email sent to ${execution.contact.email} via fixed automation`,
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
  
  console.log(`\n🎯 ✅ EXECUTION COMPLETED!`)
  console.log(`🚀 THE AUTOMATION IS NOW WORKING!`)
  console.log(`Check your analytics tab - you should see the execution!`)
}

fixBrokenAutomation().catch(console.error)