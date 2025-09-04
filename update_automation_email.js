const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function updateAutomationEmail() {
  try {
    const automationId = 'cmf576mbc0001ib049ovss2vy'
    
    console.log('Fetching current automation...')
    
    const automation = await prisma.automation.findUnique({
      where: { id: automationId }
    })
    
    if (!automation) {
      console.log('❌ Automation not found')
      return
    }
    
    console.log('Current automation name:', automation.name)
    console.log('Current status:', automation.status)
    
    // Find and update the email node
    const flow = automation.nodes
    const updatedNodes = flow.nodes.map(node => {
      if (node.type === 'email') {
        console.log(`\n📧 Updating email node: ${node.id}`)
        
        // Update with user's desired content
        return {
          ...node,
          data: {
            ...node.data,
            email: {
              fromName: 'Louis',
              replyTo: 'reply@example.com'
            }
          },
          emailTemplate: {
            subject: 'Hey {{firstName}}!',
            htmlContent: `
              <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <p>Hey {{firstName}}!</p>
                
                <p>Check out our website:</p>
                <p><a href="https://aftershockfam.org">https://aftershockfam.org</a></p>
              </div>
            `.trim(),
            textContent: `
Hey {{firstName}}!

Check out our website:
https://aftershockfam.org
            `.trim()
          }
        }
      }
      return node
    })
    
    const updatedFlow = {
      ...flow,
      nodes: updatedNodes
    }
    
    console.log('\nUpdating automation in database...')
    
    await prisma.automation.update({
      where: { id: automationId },
      data: { nodes: updatedFlow }
    })
    
    console.log('✅ Email content updated successfully!')
    
    // Verify the update
    const verifyAutomation = await prisma.automation.findUnique({
      where: { id: automationId }
    })
    
    const emailNode = verifyAutomation.nodes.nodes.find(n => n.type === 'email')
    console.log('\n📝 Updated email content:')
    console.log('Subject:', emailNode.emailTemplate.subject)
    console.log('From Name:', emailNode.data?.email?.fromName || 'Not set')
    console.log('HTML Content:')
    console.log(emailNode.emailTemplate.htmlContent)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateAutomationEmail()