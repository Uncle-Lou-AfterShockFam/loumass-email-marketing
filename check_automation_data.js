const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function checkAutomationData() {
  try {
    const automationId = 'cmf576mbc0001ib049ovss2vy'
    
    console.log('=== CHECKING AUTOMATION DATA ===')
    
    const automation = await prisma.automation.findUnique({
      where: { id: automationId },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    })
    
    if (!automation) {
      console.log('❌ Automation not found')
      return
    }
    
    console.log('Automation found:')
    console.log('  ID:', automation.id)
    console.log('  Name:', automation.name) 
    console.log('  Status:', automation.status)
    console.log('  User:', automation.user.email)
    console.log('  Created:', automation.createdAt)
    console.log('  Updated:', automation.updatedAt)
    
    console.log('\n=== AUTOMATION FLOW DATA ===')
    const flow = automation.nodes
    console.log('Nodes count:', flow.nodes?.length || 0)
    console.log('Edges count:', flow.edges?.length || 0)
    
    if (flow.nodes) {
      flow.nodes.forEach((node, index) => {
        console.log(`\nNode ${index + 1}:`)
        console.log('  ID:', node.id)
        console.log('  Type:', node.type)
        
        if (node.type === 'email' && node.emailTemplate) {
          console.log('  *** EMAIL NODE DATA ***')
          console.log('  Subject:', JSON.stringify(node.emailTemplate.subject))
          console.log('  HTML Content:', JSON.stringify(node.emailTemplate.htmlContent))
          console.log('  Text Content:', JSON.stringify(node.emailTemplate.textContent))
        }
        
        if (node.data) {
          console.log('  Data:', JSON.stringify(node.data, null, 2))
        }
      })
    }
    
    if (flow.edges) {
      console.log('\n=== EDGES ===')
      flow.edges.forEach((edge, index) => {
        console.log(`Edge ${index + 1}: ${edge.source} -> ${edge.target}`)
      })
    }
    
    console.log('\n=== EXECUTION DATA ===')
    const execution = await prisma.automationExecution.findFirst({
      where: {
        automationId: automationId,
        status: 'ACTIVE'
      },
      include: {
        contact: { select: { email: true, firstName: true } }
      }
    })
    
    if (execution) {
      console.log('Active execution found:')
      console.log('  ID:', execution.id)
      console.log('  Contact:', execution.contact.email, '(' + execution.contact.firstName + ')')
      console.log('  Status:', execution.status)
      console.log('  Current Node:', execution.currentNodeId)
      console.log('  Variables:', JSON.stringify(execution.variables, null, 2))
      console.log('  Execution Data:', JSON.stringify(execution.executionData, null, 2))
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAutomationData()