const { PrismaClient } = require('@prisma/client')
const { GmailClient } = require('./src/lib/gmail-client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function fixAutomationTest() {
  try {
    const automationId = 'cmf576mbc0001ib049ovss2vy'
    const userId = 'cmeuwk6x70000jj04gb20w4dk'
    const userEmail = 'ljpiotti@aftershockfam.org'
    
    console.log('1. Testing Gmail token refresh...')
    
    try {
      const gmailClient = new GmailClient()
      await gmailClient.getGmailService(userId, userEmail)
      console.log('✅ Gmail service working (token refreshed if needed)')
    } catch (error) {
      console.error('❌ Gmail service error:', error.message)
      return
    }
    
    console.log('\n2. Checking automation flow structure...')
    
    const automation = await prisma.automation.findUnique({
      where: { id: automationId }
    })
    
    const flow = automation.nodes
    console.log('Nodes:', flow.nodes?.length || 0)
    console.log('Edges:', flow.edges?.length || 0)
    
    if (!flow.edges || flow.edges.length === 0) {
      console.log('\n❌ PROBLEM FOUND: No edges in automation flow!')
      console.log('This means nodes are not connected, so execution cannot flow.')
      
      // Check if there's only one email node (simple case)
      if (flow.nodes && flow.nodes.length === 1 && flow.nodes[0].type === 'email') {
        console.log('\n🔧 FIXING: Creating a simple trigger->email flow...')
        
        const emailNode = flow.nodes[0]
        
        // Create a trigger node and connect it to the email
        const updatedFlow = {
          nodes: [
            {
              id: 'trigger-start',
              type: 'trigger',
              position: { x: 200, y: 200 },
              data: {
                triggerEvent: 'MANUAL'
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
      }
    }
    
    console.log('\n3. Testing execution manually...')
    
    // Get the execution and try to set currentNodeId to start from trigger
    const execution = await prisma.automationExecution.findFirst({
      where: {
        automationId: automationId,
        status: 'ACTIVE'
      }
    })
    
    if (execution && !execution.currentNodeId) {
      console.log('Setting execution to start from trigger node...')
      await prisma.automationExecution.update({
        where: { id: execution.id },
        data: { currentNodeId: 'trigger-start' }
      })
      console.log('✅ Execution currentNodeId updated')
    }
    
    console.log('\n4. Manual execution test complete')
    console.log('Now try running the automation executor...')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixAutomationTest()