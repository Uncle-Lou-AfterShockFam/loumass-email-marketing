const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRealEnrollmentFix() {
  console.log('🚀 TESTING: Thread fix with real enrollment that has sent emails...\n');
  
  // Find a real enrollment that has sent emails
  const enrollment = await prisma.sequenceEnrollment.findFirst({
    where: {
      gmailThreadId: { not: null },
      lastEmailSentAt: { not: null },
      currentStep: { gt: 1 }
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
    console.log('❌ No enrollment with sent emails found');
    await prisma.$disconnect();
    return;
  }
  
  console.log('📧 TESTING WITH REAL ENROLLMENT:');
  console.log(`  Contact: ${enrollment.contact.email}`);
  console.log(`  Thread ID: ${enrollment.gmailThreadId}`);
  console.log(`  Current Step: ${enrollment.currentStep}`);
  console.log(`  Last Email Sent: ${enrollment.lastEmailSentAt}`);
  
  // Test if this is a real vs fake thread ID
  const isRealThreadId = /^[0-9a-fA-F]+$/.test(enrollment.gmailThreadId);
  console.log(`  Thread ID Type: ${isRealThreadId ? 'REAL Gmail thread ID' : 'FAKE thread ID'}`);
  
  // Test the Gmail service
  const { GmailService } = require('./src/services/gmail-service.ts');
  const gmailService = new GmailService();
  
  console.log('\n🔍 TESTING Gmail service:');
  const gmailResult = await gmailService.getFullThreadHistory(
    enrollment.sequence.user.id, 
    enrollment.gmailThreadId
  );
  
  if (gmailResult) {
    console.log(`✅ SUCCESS: Gmail service fetched ${gmailResult.htmlContent.length} chars of thread history`);
    console.log('📧 HTML Preview:');
    console.log(gmailResult.htmlContent.substring(0, 200) + '...');
  } else {
    console.log('❌ Gmail service returned null - testing fallback system...');
    
    // Test EmailEvent fallback
    console.log('\n📊 TESTING EmailEvent fallback:');
    const emailEvents = await prisma.emailEvent.findMany({
      where: {
        contactId: enrollment.contact.id,
        sequenceId: enrollment.sequence.id,
        type: 'SENT'
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    console.log(`  Found ${emailEvents.length} email events`);
    if (emailEvents.length > 0) {
      console.log('✅ EmailEvent fallback would work');
      emailEvents.forEach((event, idx) => {
        console.log(`    ${idx + 1}. ${event.subject} - ${event.createdAt}`);
      });
    } else {
      console.log('⚠️  No EmailEvents - would send without thread history');
    }
  }
  
  await prisma.$disconnect();
}

testRealEnrollmentFix().catch(console.error);