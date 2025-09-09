const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function processRepliedEnrollment() {
  console.log('Testing sequence processing for enrollment with REPLIED event...\n');
  
  const enrollmentId = 'cmfcwjew00001l104d300d0ep';
  
  // Get the enrollment
  const enrollment = await prisma.sequenceEnrollment.findUnique({
    where: { id: enrollmentId },
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
  const steps = Array.isArray(enrollment.sequence.steps) 
    ? enrollment.sequence.steps 
    : JSON.parse(enrollment.sequence.steps);
  console.log('\nSequence has', steps.length, 'steps');
  
  const currentStepData = steps[enrollment.currentStep];
  console.log('\nCurrent step:', {
    index: enrollment.currentStep,
    type: currentStepData?.type,
    id: currentStepData?.id,
    condition: currentStepData?.condition
  });
  
  // Check for reply events
  const replyEvents = await prisma.sequenceEvent.findMany({
    where: {
      enrollmentId: enrollment.id,
      eventType: 'REPLIED'
    }
  });
  
  console.log('\nReply events found:', replyEvents.length);
  if (replyEvents.length > 0) {
    console.log('Reply event details:', replyEvents[0]);
  }
  
  // Now process the step using the service
  console.log('\n--- Processing Step with SequenceService ---');
  
  // Import the service
  const { SequenceService } = require('./dist/src/services/sequence-service.js');
  const sequenceService = new SequenceService();
  
  try {
    const result = await sequenceService.processSequenceStep(enrollment.id);
    console.log('\nProcessing result:', JSON.stringify(result, null, 2));
    
    // Check the enrollment after processing
    const updatedEnrollment = await prisma.sequenceEnrollment.findUnique({
      where: { id: enrollment.id },
      select: {
        currentStep: true,
        status: true,
        messageIdHeader: true,
        gmailThreadId: true,
        lastEmailSentAt: true
      }
    });
    
    console.log('\nUpdated enrollment:', updatedEnrollment);
    
    // Check if new email was sent
    if (result.sentStep) {
      console.log('\n✅ Email sent for step:', result.sentStep);
      
      // Check the step that was sent
      const sentStepIndex = steps.findIndex(s => s.id === result.sentStep);
      if (sentStepIndex >= 0) {
        const sentStep = steps[sentStepIndex];
        console.log('Sent step details:', {
          index: sentStepIndex,
          type: sentStep.type,
          subject: sentStep.subject,
          replyToThread: sentStep.replyToThread,
          trackingEnabled: sentStep.trackingEnabled
        });
      }
    }
    
  } catch (error) {
    console.error('Error processing step:', error);
  }
  
  await prisma.$disconnect();
}

processRepliedEnrollment().catch(console.error);