const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugThreadIssue() {
  console.log('Debugging thread history issue...\n');
  
  // Find an enrollment with a thread
  const enrollment = await prisma.sequenceEnrollment.findFirst({
    where: {
      gmailThreadId: { not: null },
      currentStep: { gte: 1 }
    },
    include: {
      sequence: {
        include: {
          user: {
            include: {
              gmailToken: true
            }
          }
        }
      },
      contact: true
    }
  });
  
  if (!enrollment) {
    console.log('No enrollment with thread found');
    await prisma.$disconnect();
    return;
  }
  
  console.log('Found enrollment:');
  console.log('- Contact:', enrollment.contact.email);
  console.log('- Thread ID:', enrollment.gmailThreadId);
  console.log('- Current Step:', enrollment.currentStep);
  console.log('- Sequence ID:', enrollment.sequenceId);
  
  const steps = typeof enrollment.sequence.steps === 'string' 
    ? JSON.parse(enrollment.sequence.steps) 
    : enrollment.sequence.steps;
    
  const currentStep = steps[enrollment.currentStep];
  console.log('- Current step type:', currentStep?.type);
  console.log('- Reply to thread:', currentStep?.replyToThread);
  
  // Check conditions that determine thread history inclusion
  console.log('\nDebugging conditions:');
  console.log('- enrollment.currentStep > 0:', enrollment.currentStep > 0);
  console.log('- enrollment.gmailThreadId exists:', !!enrollment.gmailThreadId);
  console.log('- Should include thread history:', enrollment.currentStep > 0 && enrollment.gmailThreadId);
  
  // Check Gmail token
  const gmailToken = enrollment.sequence.user.gmailToken;
  console.log('- Gmail token exists:', !!gmailToken);
  if (gmailToken) {
    console.log('- Gmail token email:', gmailToken.email);
    console.log('- Token expires at:', gmailToken.expiresAt);
    console.log('- Token expired:', gmailToken.expiresAt < new Date());
  }
  
  // Check the exact step content
  console.log('\nStep content analysis:');
  console.log('- Step subject:', currentStep?.subject);
  console.log('- Step content length:', currentStep?.content?.length || 0);
  console.log('- Step content preview:', currentStep?.content?.substring(0, 100) + '...');
  
  await prisma.$disconnect();
}

debugThreadIssue().catch(console.error);