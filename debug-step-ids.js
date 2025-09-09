const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function debugStepIds() {
  try {
    const targetSequenceId = 'cmfc3h0zh0009la04ifdwmjzm'
    
    const sequence = await prisma.sequence.findUnique({
      where: { id: targetSequenceId }
    })

    const steps = Array.isArray(sequence.steps) ? sequence.steps : JSON.parse(sequence.steps)
    
    console.log('🔍 STEP ID ANALYSIS:')
    console.log('==================')
    
    steps.forEach((step, index) => {
      console.log(`Step ${index}:`)
      console.log(`  Type: ${step.type}`)
      console.log(`  ID: ${step.id || 'NO ID'}`)
      console.log(`  Subject/Name: ${step.subject || step.name || 'No title'}`)
      
      if (step.type === 'condition') {
        console.log(`  True Branch: ${JSON.stringify(step.condition?.trueBranch)}`)
        console.log(`  False Branch: ${JSON.stringify(step.condition?.falseBranch)}`)
        
        // Check if branch targets exist
        const trueBranchId = step.condition?.trueBranch?.[0]
        const falseBranchId = step.condition?.falseBranch?.[0]
        
        if (trueBranchId) {
          const trueTargetIndex = steps.findIndex(s => s.id === trueBranchId)
          console.log(`  True Branch Target: ${trueBranchId} → ${trueTargetIndex >= 0 ? `Step ${trueTargetIndex}` : 'NOT FOUND'}`)
        }
        
        if (falseBranchId) {
          const falseTargetIndex = steps.findIndex(s => s.id === falseBranchId)
          console.log(`  False Branch Target: ${falseBranchId} → ${falseTargetIndex >= 0 ? `Step ${falseTargetIndex}` : 'NOT FOUND'}`)
        }
      }
      
      console.log('')
    })
    
    console.log('DIAGNOSIS:')
    const conditionStep = steps.find(s => s.type === 'condition')
    if (conditionStep) {
      const trueBranchId = conditionStep.condition?.trueBranch?.[0]
      const falseBranchId = conditionStep.condition?.falseBranch?.[0]
      
      const trueBranchExists = trueBranchId && steps.some(s => s.id === trueBranchId)
      const falseBranchExists = falseBranchId && steps.some(s => s.id === falseBranchId)
      
      console.log(`True branch target exists: ${trueBranchExists}`)
      console.log(`False branch target exists: ${falseBranchExists}`)
      
      if (!trueBranchExists || !falseBranchExists) {
        console.log('🐛 BUG CONFIRMED: Branch targets not found → Sequential processing → Both emails sent!')
      }
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugStepIds()