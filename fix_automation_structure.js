const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function fixAutomationStructure() {
  try {
    const automationId = 'cmf576mbc0001ib049ovss2vy'
    
    console.log('1. Checking automation flow structure...')
    
    const automation = await prisma.automation.findUnique({
      where: { id: automationId }
    })
    
    if (!automation) {
      console.log('❌ Automation not found')
      return
    }
    
    const flow = automation.nodes
    console.log('Current structure:')
    console.log('Nodes:', flow.nodes?.length || 0)
    console.log('Edges:', flow.edges?.length || 0)
    
    if (!flow.edges || flow.edges.length === 0) {
      console.log('\n❌ PROBLEM: No edges in automation flow!')
      console.log('Nodes are not connected, so execution cannot flow.')
      
      // Check if there's only one email node (simple case)
      if (flow.nodes && flow.nodes.length === 1 && flow.nodes[0].type === 'email') {
        console.log('\n🔧 FIXING: Creating a simple trigger->email flow...')
        
        const emailNode = flow.nodes[0]
        console.log('Email node:', {
          id: emailNode.id,
          type: emailNode.type,
          subject: emailNode.emailTemplate?.subject
        })
        
        // Create a trigger node and connect it to the email
        const updatedFlow = {
          nodes: [
            {
              id: 'trigger-start',
              type: 'trigger',
              position: { x: 200, y: 200 },
              data: {
                triggerEvent: 'MANUAL',
                name: 'Manual Trigger'
              }
            },
            emailNode
          ],
          edges: [
            {
              id: 'trigger-to-email',
              source: 'trigger-start',
              target: emailNode.id,
              sourceHandle: null,
              targetHandle: null
            }
          ]
        }
        
        // Update the automation
        await prisma.automation.update({
          where: { id: automationId },
          data: { nodes: updatedFlow }
        })
        
        console.log('✅ Fixed automation flow structure')
        console.log('Added trigger node and connected to email node')
      }
    }
    
    console.log('\n2. Checking execution status...')
    
    // Get the execution and try to set currentNodeId to start from trigger
    const execution = await prisma.automationExecution.findFirst({
      where: {
        automationId: automationId,
        status: 'ACTIVE'
      }
    })
    
    if (execution) {
      console.log('Found execution:', {
        id: execution.id,
        status: execution.status,
        currentNodeId: execution.currentNodeId,
        contactId: execution.contactId
      })
      
      if (!execution.currentNodeId) {
        console.log('Setting execution to start from trigger node...')
        await prisma.automationExecution.update({
          where: { id: execution.id },
          data: { 
            currentNodeId: 'trigger-start',
            status: 'ACTIVE'
          }
        })
        console.log('✅ Execution currentNodeId updated to trigger-start')
      }
    }
    
    console.log('\n3. Automation structure fix complete!')
    console.log('Ready to test automation execution.')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixAutomationStructure()