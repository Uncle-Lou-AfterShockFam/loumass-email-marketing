#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function debugSequenceStructure() {
  try {
    console.log('🔍 DEBUGGING SEQUENCE STRUCTURE')
    console.log('================================\n')
    
    const sequenceId = 'cmfc3h0zh0009la04ifdwmjzm'
    
    const sequence = await prisma.sequence.findUnique({
      where: { id: sequenceId }
    })
    
    if (!sequence) {
      console.log('❌ Sequence not found')
      return
    }
    
    console.log('✅ Found sequence:', sequence.name)
    console.log('   ID:', sequence.id)
    console.log('   Tracking Enabled:', sequence.trackingEnabled)
    
    // Parse and display steps with full details
    const steps = Array.isArray(sequence.steps) ? 
      sequence.steps : JSON.parse(sequence.steps)
    
    console.log('\n📋 FULL SEQUENCE STEPS STRUCTURE:')
    console.log(JSON.stringify(steps, null, 2))
    
    // Analyze condition step specifically
    const conditionStep = steps.find(s => s.type === 'condition')
    if (conditionStep) {
      console.log('\n🔍 CONDITION STEP ANALYSIS:')
      console.log('   ID:', conditionStep.id)
      console.log('   Name:', conditionStep.name)
      console.log('   Condition Type:', conditionStep.conditionType)
      console.log('   True Branch:', conditionStep.trueBranch || 'UNDEFINED!')
      console.log('   False Branch:', conditionStep.falseBranch || 'UNDEFINED!')
      
      if (!conditionStep.trueBranch || !conditionStep.falseBranch) {
        console.log('\n❌ CRITICAL: Condition branches are not set!')
        console.log('   This will cause both branches to execute!')
      }
      
      // Find what steps the branches should point to
      const stepIds = steps.map(s => s.id)
      console.log('\n   Available step IDs:', stepIds)
      
      // Guess which steps should be the branches based on position
      const conditionIndex = steps.findIndex(s => s.id === conditionStep.id)
      console.log('   Condition is at index:', conditionIndex)
      
      if (steps[conditionIndex + 2] && steps[conditionIndex + 3]) {
        console.log('\n   📌 Likely branch targets based on position:')
        console.log('      Step after delay (index', conditionIndex + 2, '):', steps[conditionIndex + 2].id, '- "REPLIED" email')
        console.log('      Next step (index', conditionIndex + 3, '):', steps[conditionIndex + 3].id, '- "NOT REPLIED" email')
      }
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugSequenceStructure()