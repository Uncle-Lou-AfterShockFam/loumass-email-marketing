const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testConditionLogic() {
  const sequenceId = 'cmfct1p3q0001jr04kkjy4fd1';
  
  // Get the sequence
  const sequence = await prisma.sequence.findUnique({
    where: { id: sequenceId }
  });
  
  const steps = sequence.steps;
  const conditionStep = steps[2]; // Step 2 is the condition
  
  console.log('Condition Step:', JSON.stringify(conditionStep, null, 2));
  console.log('\n---\n');
  
  // Check the condition configuration
  const condition = conditionStep.condition;
  console.log('Condition Type:', condition.type);
  console.log('Reference Step:', condition.referenceStep);
  console.log('True Branch:', condition.trueBranch);
  console.log('False Branch:', condition.falseBranch);
  console.log('\n---\n');
  
  // Check what emails are at each branch
  const trueBranchId = condition.trueBranch[0];
  const falseBranchId = condition.falseBranch[0];
  
  const trueBranchStep = steps.find(s => s.id === trueBranchId);
  const falseBranchStep = steps.find(s => s.id === falseBranchId);
  
  console.log('TRUE Branch Email (should send when NO REPLY):');
  console.log('  ID:', trueBranchStep?.id);
  console.log('  Content Preview:', trueBranchStep?.content?.substring(0, 50));
  
  console.log('\nFALSE Branch Email (should send when REPLIED):');
  console.log('  ID:', falseBranchStep?.id);
  console.log('  Content Preview:', falseBranchStep?.content?.substring(0, 50));
  
  // Check the enrollment
  const enrollment = await prisma.sequenceEnrollment.findFirst({
    where: { sequenceId },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log('\n---\n');
  console.log('Enrollment:', {
    id: enrollment.id,
    currentStep: enrollment.currentStep,
    status: enrollment.status,
    triggerCampaignId: enrollment.triggerCampaignId
  });
  
  // Check for any REPLIED events
  const repliedEvents = await prisma.sequenceEvent.findMany({
    where: {
      enrollmentId: enrollment.id,
      eventType: 'REPLIED'
    }
  });
  
  console.log('\nREPLIED Events:', repliedEvents.length);
  
  // Check which step was actually executed
  const executions = await prisma.sequenceStepExecution.findMany({
    where: {
      enrollmentId: enrollment.id
    },
    orderBy: { executedAt: 'asc' }
  });
  
  console.log('\nExecuted Steps:');
  executions.forEach(exec => {
    const step = steps.find(s => s.id === exec.stepId);
    console.log(`  Step ${exec.stepIndex}: ${exec.stepId} - ${step?.content?.substring(0, 30) || 'N/A'}`);
  });
  
  await prisma.$disconnect();
}

testConditionLogic().catch(console.error);