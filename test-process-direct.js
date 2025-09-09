// Direct test without the service
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function processDirectly() {
  console.log('Getting enrollment...');
  
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
  
  console.log('Found enrollment:', {
    id: enrollment.id,
    currentStep: enrollment.currentStep,
    status: enrollment.status,
    contactEmail: enrollment.contact.email,
    messageIdHeader: enrollment.messageIdHeader,
    gmailThreadId: enrollment.gmailThreadId
  });
  
  // Get the current step
  const steps = enrollment.sequence.steps;
  const currentStep = steps[enrollment.currentStep];
  
  console.log('\nCurrent step:', {
    index: enrollment.currentStep,
    type: currentStep?.type,
    id: currentStep?.id,
    replyToThread: currentStep?.replyToThread,
    trackingEnabled: currentStep?.trackingEnabled,
    subject: currentStep?.subject || '(empty - will reply in thread)',
    content: currentStep?.content?.substring(0, 50) + '...'
  });
  
  // Check what threading data we have
  console.log('\nThreading data:');
  console.log('  Message-ID from Email 1:', enrollment.messageIdHeader);
  console.log('  Gmail Thread ID:', enrollment.gmailThreadId);
  console.log('  Step says replyToThread:', currentStep?.replyToThread);
  
  // Now let's process this step manually
  console.log('\n=== Processing step manually ===');
  
  // Import Gmail service
  const { GmailService } = require('./src/services/gmail');
  const gmailService = new GmailService();
  
  // Prepare email data
  const emailData = {
    to: enrollment.contact.email,
    subject: currentStep.subject || '', // Empty subject for thread reply
    content: currentStep.content,
    replyToThread: currentStep.replyToThread,
    trackingEnabled: currentStep.trackingEnabled,
    messageIdForReply: enrollment.messageIdHeader, // THIS IS KEY!
    gmailThreadId: enrollment.gmailThreadId,
    fromName: enrollment.sequence.user.fromName || enrollment.sequence.user.name || 'LOUMASS',
    contact: enrollment.contact
  };
  
  console.log('\nEmail data prepared:', {
    to: emailData.to,
    subject: emailData.subject,
    replyToThread: emailData.replyToThread,
    trackingEnabled: emailData.trackingEnabled,
    messageIdForReply: emailData.messageIdForReply,
    gmailThreadId: emailData.gmailThreadId
  });
  
  try {
    // Send the email
    console.log('\nSending email...');
    const result = await gmailService.sendEmail(
      enrollment.sequence.user.gmailToken,
      emailData.to,
      emailData.subject,
      emailData.content,
      {
        replyToThread: emailData.replyToThread,
        trackingEnabled: emailData.trackingEnabled,
        messageIdForReply: emailData.messageIdForReply,
        gmailThreadId: emailData.gmailThreadId,
        fromName: emailData.fromName,
        userId: enrollment.sequence.userId,
        contact: emailData.contact,
        enrollmentId: enrollment.id,
        sequenceId: enrollment.sequenceId,
        stepIndex: enrollment.currentStep
      }
    );
    
    console.log('\nEmail sent successfully!');
    console.log('Result:', {
      success: result.success,
      messageId: result.messageId,
      threadId: result.threadId,
      hasTracking: result.trackingAdded
    });
    
    // Update enrollment
    await prisma.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: {
        currentStep: enrollment.currentStep + 1,
        lastEmailSentAt: new Date()
      }
    });
    
    console.log('\nEnrollment updated to step', enrollment.currentStep + 1);
    
  } catch (error) {
    console.error('Error sending email:', error);
  }
  
  await prisma.$disconnect();
}

processDirectly().catch(console.error);