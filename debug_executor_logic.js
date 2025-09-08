const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

// Simulate the automation executor logic
function getNextNodes(nodeId, flow, branch) {
  console.log(`🔍 getNextNodes called with nodeId: ${nodeId}, branch: ${branch || 'none'}`)
  
  const edges = flow.edges.filter(edge => {
    if (edge.source === nodeId) {
      const matches = !branch || edge.sourceHandle === branch
      console.log(`  Edge ${edge.id}: ${edge.source} -> ${edge.target}, sourceHandle: ${edge.sourceHandle || 'none'}, matches: ${matches}`)
      return matches
    }
    return false
  })
  
  console.log(`  Found ${edges.length} matching edges`)
  
  const nextNodes = edges
    .map(edge => {
      const node = flow.nodes.find(n => n.id === edge.target)
      console.log(`  Target node ${edge.target}: ${node ? `found (${node.type})` : 'NOT FOUND'}`)
      return node
    })
    .filter(Boolean)
    
  console.log(`  Returning ${nextNodes.length} next nodes`)
  return nextNodes
}

function getNextNode(nodeId, flow) {
  console.log(`🎯 getNextNode called with nodeId: ${nodeId}`)
  const nextNodes = getNextNodes(nodeId, flow)
  const result = nextNodes.length > 0 ? nextNodes[0] : null
  console.log(`  Returning: ${result ? `${result.id} (${result.type})` : 'null'}`)
  return result
}

async function debugExecutorLogic() {
  const automationId = 'cmf5vvi960001jr04faqaplk5'
  
  console.log(`=== DEBUGGING EXECUTOR LOGIC ===`)
  console.log(`Automation ID: ${automationId}`)
  
  // Get the automation with its flow data
  const automation = await prisma.automation.findUnique({
    where: { id: automationId }
  })
  
  if (!automation) {
    console.log('❌ Automation not found!')
    return
  }
  
  const automationFlow = automation.nodes
  console.log(`\n📊 FLOW DATA:`)
  console.log(`Nodes: ${automationFlow.nodes.length}`)
  console.log(`Edges: ${automationFlow.edges.length}`)
  
  // List all nodes
  automationFlow.nodes.forEach(node => {
    console.log(`  - Node ${node.id}: ${node.type} (${node.name || 'Unnamed'})`)
  })
  
  // List all edges
  automationFlow.edges.forEach(edge => {
    console.log(`  - Edge ${edge.id}: ${edge.source} -> ${edge.target} (sourceHandle: ${edge.sourceHandle || 'none'})`)
  })
  
  console.log(`\n🔄 SIMULATING EXECUTOR LOGIC:`)
  
  // Simulate the logic from automation-executor.ts lines 158-178
  const currentNodeId = null // Simulating new execution
  let currentNode = null
  
  console.log(`Current node ID: ${currentNodeId || 'null'}`)
  
  if (currentNodeId) {
    console.log(`Looking for existing currentNodeId...`)
    currentNode = automationFlow.nodes.find(n => n.id === currentNodeId) || null
    console.log(`Found current node: ${currentNode ? currentNode.id : 'null'}`)
  } else {
    console.log(`No currentNodeId, looking for trigger node...`)
    // Find the trigger node to start
    const triggerNode = automationFlow.nodes.find(n => n.type === 'trigger')
    console.log(`Trigger node found: ${triggerNode ? triggerNode.id : 'none'}`)
    
    if (triggerNode) {
      console.log(`Getting next node after trigger...`)
      // Move to first node after trigger
      const nextNode = getNextNode(triggerNode.id, automationFlow)
      if (nextNode) {
        currentNode = nextNode
        console.log(`✅ Setting current node to: ${currentNode.id} (${currentNode.type})`)
      } else {
        console.log(`❌ No next node found after trigger!`)
      }
    }
  }
  
  console.log(`\n🎯 FINAL RESULT:`)
  if (!currentNode) {
    console.log(`❌ currentNode is null - execution would be marked as COMPLETED immediately!`)
    console.log(`This is the bug! The execution should process the email node but instead gets completed.`)
  } else {
    console.log(`✅ currentNode is: ${currentNode.id} (${currentNode.type})`)
    console.log(`This node should be processed next.`)
  }
  
  await prisma.$disconnect()
}

debugExecutorLogic().catch(console.error)