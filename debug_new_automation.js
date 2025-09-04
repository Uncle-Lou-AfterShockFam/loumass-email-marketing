const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function debugNewAutomation() {
  const automationId = 'cmf5vvi960001jr04faqaplk5'
  
  console.log(`=== DEBUGGING NEW AUTOMATION ISSUE ===`)
  console.log(`Automation ID: ${automationId}`)
  console.log(`Time: ${new Date()}`)
  
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
  console.log(`Created: ${automation.createdAt}`)
  
  // Check the nodes structure
  console.log(`\n🔍 NODES STRUCTURE:`)
  console.log(`Raw nodes data:`, JSON.stringify(automation.nodes, null, 2))
  
  if (automation.nodes && automation.nodes.nodes) {
    console.log(`\n📊 ANALYSIS:`)
    console.log(`Total nodes: ${automation.nodes.nodes.length}`)
    console.log(`Total edges: ${automation.nodes.edges?.length || 0}`)
    
    const hasTrigger = automation.nodes.nodes.some(n => n.type === 'trigger')
    console.log(`Has trigger node: ${hasTrigger}`)
    
    automation.nodes.nodes.forEach(node => {
      console.log(`  - Node ${node.id}: ${node.type} (${node.name || 'Unnamed'})`)
    })
    
    if (automation.nodes.edges) {
      automation.nodes.edges.forEach(edge => {
        console.log(`  - Edge: ${edge.source} -> ${edge.target}`)
      })
    }
  } else {
    console.log(`❌ NO NODES STRUCTURE FOUND!`)
    console.log(`This means the automation creation API is not working!`)
  }
  
  // Compare with working sequence
  console.log(`\n🔄 COMPARING WITH WORKING SEQUENCE...`)
  const workingSequence = await prisma.sequence.findUnique({
    where: { id: 'cmf5w139s0005l1048i02rppo' }
  })
  
  if (workingSequence) {
    console.log(`\n✅ Working Sequence: "${workingSequence.name}"`)
    console.log(`Sequence steps:`, JSON.stringify(workingSequence.steps, null, 2))
  }
  
  await prisma.$disconnect()
}

debugNewAutomation().catch(console.error)