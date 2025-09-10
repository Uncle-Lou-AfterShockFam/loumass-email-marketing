const { PrismaClient } = require('@prisma/client');
const { GmailService } = require('./src/services/gmail-service.ts');
const prisma = new PrismaClient();

async function testGmailAPIDirect() {
  console.log('🔬 TESTING: Gmail API directly with real thread ID...\n');
  
  // Get the most recent enrollment with thread
  const enrollment = await prisma.sequenceEnrollment.findFirst({
    where: {
      gmailThreadId: { not: null },
      lastEmailSentAt: { not: null }
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
    },
    orderBy: {
      lastEmailSentAt: 'desc'
    }
  });
  
  if (!enrollment) {
    console.log('No enrollment found');
    await prisma.$disconnect();
    return;
  }
  
  console.log(`Testing with thread: ${enrollment.gmailThreadId}`);
  console.log(`Contact: ${enrollment.contact.email}`);
  console.log(`User: ${enrollment.sequence.user.email}`);
  
  // Test the Gmail API call directly
  const gmailService = new GmailService();
  
  try {
    console.log('\\n🚀 Calling getFullThreadHistory...');
    const result = await gmailService.getFullThreadHistory(
      enrollment.sequence.user.id, 
      enrollment.gmailThreadId
    );
    
    if (result) {
      console.log('✅ SUCCESS!');
      console.log(`HTML content length: ${result.htmlContent.length}`);
      console.log(`Text content length: ${result.textContent.length}`);
      console.log('\\nHTML preview:');
      console.log(result.htmlContent.substring(0, 500));
    } else {
      console.log('❌ FAILED: getFullThreadHistory returned null');
    }
  } catch (error) {
    console.error('💥 ERROR:', error.message);
    console.error('Full error:', error);
  }
  
  await prisma.$disconnect();
}

testGmailAPIDirect().catch(console.error);