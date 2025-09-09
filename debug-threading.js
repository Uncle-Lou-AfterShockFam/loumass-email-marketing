const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugThreading() {
  try {
    // Get the enrollment that just completed
    const enrollment = await prisma.sequenceEnrollment.findUnique({
      where: { id: 'cmfcyrt6q0001jr04yklpvv7u' },
      include: {
        sequence: {
          select: {
            id: true,
            name: true,
            steps: true
          }
        },
        contact: {
          select: {
            email: true
          }
        }
      }
    });

    console.log('\n=== ENROLLMENT DETAILS ===');
    console.log('ID:', enrollment.id);
    console.log('Contact:', enrollment.contact.email);
    console.log('Status:', enrollment.status);
    console.log('Current Step:', enrollment.currentStep);
    console.log('Message-ID stored:', enrollment.messageIdHeader);
    console.log('Thread ID stored:', enrollment.gmailThreadId);
    console.log('Last email sent at:', enrollment.lastEmailSentAt);

    // Parse the steps
    const steps = Array.isArray(enrollment.sequence.steps) 
      ? enrollment.sequence.steps 
      : JSON.parse(enrollment.sequence.steps);

    console.log('\n=== SEQUENCE STEPS ===');
    steps.forEach((step, index) => {
      console.log(`\nStep ${index}: ${step.type}`);
      if (step.type === 'email') {
        console.log('  Subject:', step.subject);
        console.log('  Reply to thread:', step.replyToThread);
      }
    });

    // Check what emails were sent
    const emailEvents = await prisma.emailEvent.findMany({
      where: {
        sequenceId: enrollment.sequenceId,
        type: 'SENT',
        createdAt: {
          gte: new Date('2025-09-09T19:45:00Z')
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log('\n=== EMAILS SENT ===');
    emailEvents.forEach(event => {
      console.log(`\n${event.createdAt.toISOString()}`);
      console.log('  Subject:', event.subject);
      console.log('  Event Data:', event.eventData);
    });

    // Check step executions
    const executions = await prisma.sequenceStepExecution.findMany({
      where: { enrollmentId: enrollment.id },
      orderBy: { stepIndex: 'asc' }
    });

    console.log('\n=== STEP EXECUTIONS ===');
    executions.forEach(exec => {
      console.log(`\nStep ${exec.stepIndex}: ${exec.status}`);
      console.log('  Executed at:', exec.executedAt.toISOString());
    });

    // Check if the follow-up email (step 3) should have had threading
    const followUpStep = steps[3];
    if (followUpStep) {
      console.log('\n=== FOLLOW-UP EMAIL (Step 3) ===');
      console.log('Subject:', followUpStep.subject);
      console.log('Reply to thread:', followUpStep.replyToThread);
      console.log('Should have used Message-ID:', enrollment.messageIdHeader);
      console.log('Should have used Thread ID:', enrollment.gmailThreadId);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugThreading();