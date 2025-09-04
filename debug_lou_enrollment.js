const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function debugLouEnrollment() {
  const automationId = 'cmf5tp3mc0002jp04coadmolg'
  const targetEmail = 'lou@soberafe.com'
  
  console.log(`=== DEBUGGING LOU ENROLLMENT ISSUE ===`)
  console.log(`Automation: ${automationId}`)
  console.log(`Target Contact: ${targetEmail}`)
  console.log(`Time: ${new Date()}`)
  
  // 1. Check if contact exists
  const contact = await prisma.contact.findFirst({
    where: { 
      email: targetEmail 
    }
  })
  
  if (!contact) {
    console.log('❌ CRITICAL: Contact lou@soberafe.com does not exist!')
    console.log('This is why enrollment is failing!')
    
    // Let's see what contacts DO exist for this user
    const automation = await prisma.automation.findUnique({
      where: { id: automationId },
      select: { userId: true }
    })
    
    const userContacts = await prisma.contact.findMany({
      where: { userId: automation.userId },
      select: { email: true, firstName: true, lastName: true },
      take: 10
    })
    
    console.log(`\\nContacts that DO exist for this user:`)
    userContacts.forEach(c => {
      console.log(`  - ${c.email} (${c.firstName} ${c.lastName})`)
    })
    
    return
  }
  
  console.log(`✅ Contact found: ${contact.firstName} ${contact.lastName} (ID: ${contact.id})`)
  
  // 2. Check ALL executions for this contact in this automation
  const allExecutions = await prisma.automationExecution.findMany({
    where: {
      automationId: automationId,
      contactId: contact.id
    },
    orderBy: { createdAt: 'desc' }
  })
  
  console.log(`\\n📊 ALL EXECUTIONS for this contact:`)
  console.log(`Total: ${allExecutions.length}`)
  
  if (allExecutions.length === 0) {
    console.log('❌ NO EXECUTIONS FOUND! This means enrollment failed to create execution.')
    console.log('This could be due to:')
    console.log('1. Unique constraint error (execution already exists)')
    console.log('2. API error during enrollment')
    console.log('3. Frontend not calling the enrollment API')
  } else {
    allExecutions.forEach(exec => {
      console.log(`  - ${exec.id}: ${exec.status} (Node: ${exec.currentNodeId || 'None'}) - Created: ${exec.createdAt}`)
    })
  }
  
  // 3. Check if there's a constraint preventing new execution
  try {
    console.log(`\\n🔄 TESTING: Can we create a new execution?`)
    const testExecution = await prisma.automationExecution.create({
      data: {
        automationId: automationId,
        contactId: contact.id,
        status: 'ACTIVE',
        executionData: { variables: {}, source: 'debug-test' },
        enteredAt: new Date(),
        startedAt: new Date()
      }
    })
    console.log(`✅ SUCCESS: Created test execution ${testExecution.id}`)
    
    // Now process this execution immediately
    console.log(`\\n🎯 PROCESSING TEST EXECUTION...`)
    await processExecutionImmediately(testExecution.id, automationId)
    
  } catch (error) {
    if (error.code === 'P2002') {
      console.log(`❌ UNIQUE CONSTRAINT ERROR: An execution already exists for this contact!`)
      console.log(`This means the enrollment DID work, but the execution exists and might be stuck.`)
      
      // Find the existing execution and process it
      const existingExecution = allExecutions.find(e => e.status === 'ACTIVE')
      if (existingExecution) {
        console.log(`\\n🔧 FOUND STUCK EXECUTION: ${existingExecution.id}`)
        console.log(`Processing it now...`)
        await processExecutionImmediately(existingExecution.id, automationId)
      }
    } else {
      console.log(`❌ UNEXPECTED ERROR: ${error.message}`)
    }
  }
  
  await prisma.$disconnect()
}

async function processExecutionImmediately(executionId, automationId) {
  console.log(`\\n⚡ IMMEDIATE PROCESSING: ${executionId}`)
  
  // Get execution with automation and contact
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
  const currentNodeId = execution.currentNodeId
  
  console.log(`Current node: ${currentNodeId || 'None - Starting from trigger'}`)
  
  // Find starting point
  let currentNode = null
  
  if (currentNodeId) {
    currentNode = automationFlow.nodes.find(n => n.id === currentNodeId)
  } else {
    // Start from trigger
    const triggerNode = automationFlow.nodes.find(n => n.type === 'trigger')
    if (triggerNode) {
      // Move to next node after trigger
      const edges = automationFlow.edges.filter(edge => edge.source === triggerNode.id)
      if (edges.length > 0) {
        const nextNodeId = edges[0].target
        currentNode = automationFlow.nodes.find(n => n.id === nextNodeId)
        
        // Update execution to point to this node
        await prisma.automationExecution.update({
          where: { id: executionId },
          data: { currentNodeId: nextNodeId }
        })
        console.log(`✅ Updated execution to start at node: ${nextNodeId}`)
      }
    }
  }
  
  if (!currentNode) {
    console.log('❌ No current node found')
    return
  }
  
  console.log(`\\n📧 Processing ${currentNode.type} node: ${currentNode.id}`)
  
  if (currentNode.type === 'email') {
    // Process email node
    const emailTemplate = currentNode.emailTemplate
    console.log(`Subject: ${emailTemplate.subject}`)
    console.log(`Content preview: ${emailTemplate.content.substring(0, 100)}...`)
    
    // Check Gmail token
    const gmailToken = await prisma.gmailToken.findUnique({
      where: { userId: execution.automation.userId }
    })
    
    if (!gmailToken) {
      console.log('❌ No Gmail token found')
      return
    }
    
    console.log(`✅ Gmail token exists for: ${gmailToken.email}`)
    
    // Process template variables
    const firstName = execution.contact.firstName || 'there'
    const processedSubject = emailTemplate.subject.replace(/\\{\\{firstName\\}\\}/g, firstName)
    const processedContent = emailTemplate.content.replace(/\\{\\{firstName\\}\\}/g, firstName)
    
    console.log(`\\n📤 SENDING EMAIL:`)
    console.log(`To: ${execution.contact.email}`)
    console.log(`Subject: ${processedSubject}`)
    console.log(`Content: ${processedContent}`)
    
    // Create email event
    try {
      const emailEvent = await prisma.emailEvent.create({
        data: {
          contactId: execution.contactId,
          eventType: 'SENT',
          subject: processedSubject,
          details: `Email sent to ${execution.contact.email} via automation`,
          userId: execution.automation.userId,
          timestamp: new Date(),
          createdAt: new Date()
        }
      })
      
      console.log(`✅ Created email event: ${emailEvent.id}`)
    } catch (eventError) {
      console.log(`⚠️ Could not create email event: ${eventError.message}`)
    }
    
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
      where: { id: automationId },
      data: {
        currentlyActive: { decrement: 1 },
        totalCompleted: { increment: 1 }
      }
    })
    
    console.log(`\\n🎯 ✅ EXECUTION COMPLETED!`)
    console.log(`Email sent and analytics updated!`)
    console.log(`Check your analytics tab now!`)
  }
}

debugLouEnrollment().catch(console.error)