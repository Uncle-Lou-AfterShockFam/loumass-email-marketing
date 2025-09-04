const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function fixEmailContent() {
  try {
    const automationId = 'cmf576mbc0001ib049ovss2vy'
    
    console.log('1. Getting current automation...')
    
    const automation = await prisma.automation.findUnique({
      where: { id: automationId }
    })
    
    if (!automation) {
      console.log('❌ Automation not found')
      return
    }
    
    console.log('2. Fixing email node content...')
    
    const flow = automation.nodes
    const updatedNodes = flow.nodes.map(node => {
      if (node.type === 'email' && node.emailTemplate) {
        console.log(`Fixing email node: ${node.id}`)
        console.log(`Current subject: ${node.emailTemplate.subject}`)
        
        // Add proper email content
        return {
          ...node,
          emailTemplate: {
            ...node.emailTemplate,
            htmlContent: `
              <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <p>Hi {{firstName}},</p>
                
                <p>This is your personalized test email from the LOUMASS automation system!</p>
                
                <p>We're excited to have you here.</p>
                
                <p>Best regards,<br>
                The LOUMASS Team</p>
              </div>
            `.trim(),
            textContent: `
Hi {{firstName}},

This is your personalized test email from the LOUMASS automation system!

We're excited to have you here.

Best regards,
The LOUMASS Team
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
    
    console.log('3. Updating automation...')
    
    await prisma.automation.update({
      where: { id: automationId },
      data: { nodes: updatedFlow }
    })
    
    console.log('✅ Email content fixed!')
    
    console.log('4. Updated email node:')
    const updatedAutomation = await prisma.automation.findUnique({
      where: { id: automationId }
    })
    
    const emailNode = updatedAutomation.nodes.nodes.find(n => n.type === 'email')
    console.log('Email subject:', emailNode.emailTemplate.subject)
    console.log('HTML content length:', emailNode.emailTemplate.htmlContent.length)
    console.log('Text content length:', emailNode.emailTemplate.textContent.length)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixEmailContent()