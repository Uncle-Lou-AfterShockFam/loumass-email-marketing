const { PrismaClient } = require('@prisma/client')

async function analyzeSequenceFlow() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Analyzing sequence flow and Step 5 thread issue...')
    
    // Get the sequence
    const sequence = await prisma.sequence.findUnique({
      where: {
        id: 'cmff84sdu0001l504xpkstmrr'
      }
    })
    
    const steps = Array.isArray(sequence.steps) 
      ? sequence.steps 
      : JSON.parse(sequence.steps)
    
    console.log('\n📋 Sequence Structure:')
    steps.forEach((step, index) => {
      console.log(`\nStep ${index + 1} (index ${index}):`)
      console.log(`  ID: ${step.id}`)
      console.log(`  Type: ${step.type}`)
      
      if (step.type === 'email') {
        console.log(`  Subject: ${step.subject}`)
        console.log(`  Reply to thread: ${step.replyToThread}`)
        console.log(`  Next step: ${step.nextStepId || 'END'}`)
      } else if (step.type === 'delay') {
        console.log(`  Delay: ${step.delay?.value} ${step.delay?.unit}`)
        console.log(`  Next step: ${step.nextStepId || 'END'}`)
      } else if (step.type === 'condition') {
        console.log(`  Condition: ${step.condition?.type}`)
        console.log(`  Reference step: ${step.condition?.referenceStep}`)
        console.log(`  True branch: ${step.condition?.trueBranch?.[0] || 'NONE'}`)
        console.log(`  False branch: ${step.condition?.falseBranch?.[0] || 'NONE'}`)
      }
    })
    
    // Map step IDs to indices
    const stepIdToIndex = {}
    steps.forEach((step, index) => {
      stepIdToIndex[step.id] = index
    })
    
    console.log('\n🗺️ Step ID to Index Mapping:')
    Object.entries(stepIdToIndex).forEach(([id, index]) => {
      console.log(`  ${id} → Step ${index + 1} (index ${index})`)
    })
    
    // Analyze the condition branching
    const conditionStep = steps[2] // Step 3 is index 2
    console.log('\n🔀 Condition Analysis (Step 3):')
    console.log(`  Checks if contact has NOT replied to: ${conditionStep.condition?.referenceStep}`)
    console.log(`  Reference step index: ${stepIdToIndex[conditionStep.condition?.referenceStep]}`)
    console.log(`  If NOT replied (true): Jump to ${conditionStep.condition?.trueBranch?.[0]} (Step ${stepIdToIndex[conditionStep.condition?.trueBranch?.[0]] + 1})`)
    console.log(`  If HAS replied (false): Jump to ${conditionStep.condition?.falseBranch?.[0]} (Step ${stepIdToIndex[conditionStep.condition?.falseBranch?.[0]] + 1})`)
    
    // Simulate the flow
    console.log('\n🔄 Simulated Flow for Non-Reply Scenario:')
    console.log('1. Start at Step 1 (index 0) - Send email, set gmailThreadId')
    console.log('2. Move to Step 2 (index 1) - Wait 1 minute')
    console.log('3. Move to Step 3 (index 2) - Check condition')
    console.log('4. Contact has NOT replied → TRUE branch')
    console.log(`5. Jump to Step ${stepIdToIndex[conditionStep.condition?.trueBranch?.[0]] + 1} (${conditionStep.condition?.trueBranch?.[0]})`)
    console.log('6. This is Step 5 - the final email!')
    
    console.log('\n⚠️  ISSUE IDENTIFIED:')
    console.log('The TRUE branch (not replied) jumps directly to Step 5, skipping Step 4!')
    console.log('The FALSE branch (has replied) goes to Step 4.')
    console.log('\nThis means:')
    console.log('- If contact does NOT reply: Step 1 → Step 2 (delay) → Step 3 (condition) → Step 5')
    console.log('- If contact DOES reply: Step 1 → Step 2 (delay) → Step 3 (condition) → Step 4 → Step 5')
    
    console.log('\n💡 ROOT CAUSE:')
    console.log('When the contact does NOT reply (most common case), the sequence goes:')
    console.log('Step 1 (email) → Step 5 (email)')
    console.log('Step 5 has replyToThread=true but might not have thread history if Step 1 failed!')
    
  } catch (error) {
    console.error('💥 ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

analyzeSequenceFlow()