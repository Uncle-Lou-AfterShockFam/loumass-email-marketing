const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSequenceProcessing() {
  console.log('Testing sequence processing directly...\n');
  
  // Get the enrollment
  const enrollment = await prisma.sequenceEnrollment.findUnique({
    where: { id: 'cmfct1y7e0003jr047tlwar7k' },
    include: {
      contact: true,
      sequence: {
        include: {
          user: {
            include: {
              gmailToken: true
            }
          }
        }
      }
    }
  });
  
  if (!enrollment) {
    console.log('Enrollment not found');
    return;
  }
  
  console.log('Enrollment found:', {
    id: enrollment.id,
    currentStep: enrollment.currentStep,
    status: enrollment.status,
    contactEmail: enrollment.contact.email,
    sequenceName: enrollment.sequence.name,
    messageIdHeader: enrollment.messageIdHeader,
    gmailThreadId: enrollment.gmailThreadId
  });
  
  // Parse the sequence steps
  const steps = JSON.parse(enrollment.sequence.steps);
  console.log('\nSequence has', steps.length, 'steps');
  
  const currentStepData = steps[enrollment.currentStep];
  console.log('\nCurrent step:', {
    index: enrollment.currentStep,
    type: currentStepData?.type,
    id: currentStepData?.id
  });
  
  // Check for reply events
  const replyEvents = await prisma.sequenceEvent.findMany({
    where: {
      enrollmentId: enrollment.id,
      eventType: 'REPLIED'
    }
  });
  
  console.log('\nReply events found:', replyEvents.length);
  
  // Now process the step using the service
  console.log('\n--- Processing Step ---');
  
  // Import the service
  const { SequenceService } = require('./dist/src/services/sequence-service.js');
  const sequenceService = new SequenceService();
  
  try {
    const result = await sequenceService.processSequenceStep(enrollment.id);
    console.log('\nProcessing result:', result);
  } catch (error) {
    console.error('Error processing step:', error);
  }
  
  // Check the enrollment after processing
  const updatedEnrollment = await prisma.sequenceEnrollment.findUnique({
    where: { id: enrollment.id },
    select: {
      currentStep: true,
      status: true,
      messageIdHeader: true,
      gmailThreadId: true
    }
  });
  
  console.log('\nUpdated enrollment:', updatedEnrollment);
  
  await prisma.$disconnect();
}

testSequenceProcessing().catch(console.error);