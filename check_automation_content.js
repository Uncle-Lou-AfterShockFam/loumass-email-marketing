const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function checkAutomationContent() {
  try {
    const automationId = 'cmf576mbc0001ib049ovss2vy'
    
    console.log('Checking automation content...')
    
    const automation = await prisma.automation.findUnique({
      where: { id: automationId }
    })
    
    if (!automation) {
      console.log('❌ Automation not found')
      return
    }
    
    console.log('Automation name:', automation.name)
    console.log('Status:', automation.status)
    
    const emailNode = automation.nodes.nodes.find(n => n.type === 'email')
    
    if (emailNode) {
      console.log('\n📧 Email Node Configuration:')
      console.log('Node ID:', emailNode.id)
      
      if (emailNode.data?.email) {
        console.log('\nEmail Settings (data.email):')
        console.log('From Name:', emailNode.data.email.fromName || 'Not set')
        console.log('Subject:', emailNode.data.email.subject || 'Not set')
      }
      
      if (emailNode.emailTemplate) {
        console.log('\nEmail Template:')
        console.log('Subject:', emailNode.emailTemplate.subject)
        console.log('\nHTML Content:')
        console.log('---START---')
        console.log(emailNode.emailTemplate.htmlContent)
        console.log('---END---')
        console.log('\nText Content:')
        console.log('---START---')
        console.log(emailNode.emailTemplate.textContent)
        console.log('---END---')
      }
    } else {
      console.log('No email node found')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAutomationContent()