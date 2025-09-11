const { PrismaClient } = require('@prisma/client')

async function analyzeSequenceStructure() {
  const prisma = new PrismaClient()
  
  try {
    const sequence = await prisma.sequence.findUnique({
      where: { id: 'cmffvbebb0005id04l2xdel7k' }
    })
    
    if (!sequence) {
      console.log('Sequence not found')
      return
    }
    
    console.log('🔍 ANALYZING SEQUENCE STRUCTURE')
    console.log('=' .repeat(50))
    console.log(`Sequence: ${sequence.name}`)
    console.log(`ID: ${sequence.id}`)
    
    const steps = sequence.steps
    console.log(`\nTotal steps in array: ${steps.length}`)
    
    console.log('\n📋 STEP-BY-STEP BREAKDOWN:')
    steps.forEach((step, index) => {
      console.log(`\nIndex ${index}:`)
      console.log(`  ID: ${step.id}`)
      console.log(`  Type: ${step.type}`)
      
      if (step.type === 'email') {
        console.log(`  Subject: ${step.subject}`)
        console.log(`  Content preview: ${step.content?.substring(0, 50)}...`)
        console.log(`  Reply to thread: ${step.replyToThread}`)
        console.log(`  Tracking enabled: ${step.trackingEnabled}`)
        console.log(`  Next step ID: ${step.nextStepId}`)
      } else if (step.type === 'delay') {
        console.log(`  Delay: ${step.delay?.minutes || 0} minutes`)
        console.log(`  Next step ID: ${step.nextStepId}`)
      } else if (step.type === 'condition') {
        console.log(`  Condition type: ${step.condition?.type}`)
        console.log(`  Reference step: ${step.condition?.referenceStep}`)
        console.log(`  TRUE branch: ${step.condition?.trueBranch}`)
        console.log(`  FALSE branch: ${step.condition?.falseBranch}`)
      }
    })
    
    console.log('\n🔄 FLOW ANALYSIS:')
    console.log('Step 0: Initial email')
    console.log('Step 1: Delay 5 minutes')
    console.log('Step 2: Condition (not_replied)')
    console.log('  - If TRUE (no reply): goes to email-1757442749653')
    console.log('  - If FALSE (has reply): goes to email-1757442704985')
    
    console.log('\nMAPPING IDs TO INDICES:')
    steps.forEach((step, index) => {
      if (step.id === 'email-1757442749653') {
        console.log(`  email-1757442749653 is at index ${index} - Content: "${step.content?.substring(0, 30)}..."`)
      }
      if (step.id === 'email-1757442704985') {
        console.log(`  email-1757442704985 is at index ${index} - Content: "${step.content?.substring(0, 30)}..."`)
      }
    })
    
    console.log('\n⚠️  CRITICAL OBSERVATION:')
    console.log('The condition node has:')
    console.log('  trueBranch: ["email-1757442749653"] - This is the "NO REPLY!" email')
    console.log('  falseBranch: ["email-1757442704985"] - This is the "REPLIED!" email')
    console.log('\nBut in the linear array:')
    console.log('  Index 3: email-1757442704985 (REPLIED! email)')
    console.log('  Index 4: email-1757442749653 (NO REPLY! email)')
    
    console.log('\n🐛 THE BUG:')
    console.log('The sequenceProcessor is using array indices (step+1 for TRUE, step+2 for FALSE)')
    console.log('But the actual IDs in the condition branches don\'t match this assumption!')
    console.log('The TRUE branch points to index 4, but step+1 would be index 3')
    console.log('The FALSE branch points to index 3, but step+2 would be index 4')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

analyzeSequenceStructure()