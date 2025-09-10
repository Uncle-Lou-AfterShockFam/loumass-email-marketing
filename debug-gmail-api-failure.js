const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugGmailAPIFailure() {
  console.log('🚨 DEBUGGING: Why Gmail API is completely failing...\n');
  
  // Find recent enrollments with threads
  const enrollments = await prisma.sequenceEnrollment.findMany({
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
    },
    take: 3
  });
  
  console.log(`Found ${enrollments.length} recent enrollments with threads:\n`);
  
  for (const enrollment of enrollments) {
    console.log(`📧 Contact: ${enrollment.contact.email}`);
    console.log(`   Thread ID: ${enrollment.gmailThreadId}`);
    console.log(`   Current Step: ${enrollment.currentStep}`);
    console.log(`   Last Email: ${enrollment.lastEmailSentAt}`);
    
    const gmailToken = enrollment.sequence.user.gmailToken;
    if (gmailToken) {
      console.log(`   Gmail Token: ${gmailToken.email}`);
      console.log(`   Token Expires: ${gmailToken.expiresAt}`);
      console.log(`   Token Expired: ${gmailToken.expiresAt < new Date()}`);
      console.log(`   Days Expired: ${Math.round((new Date() - gmailToken.expiresAt) / (1000 * 60 * 60 * 24))}`);
    } else {
      console.log(`   ❌ NO GMAIL TOKEN FOUND`);
    }
    
    // Check EmailEvents for this enrollment to see what was actually sent
    const emailEvents = await prisma.emailEvent.findMany({
      where: {
        contactId: enrollment.contactId,
        sequenceId: enrollment.sequenceId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 3
    });
    
    console.log(`   Email Events: ${emailEvents.length} found`);
    emailEvents.forEach((event, idx) => {
      console.log(`     ${idx + 1}. ${event.eventType} - ${event.createdAt} - Subject: ${event.subject}`);
      if (event.threadId) {
        console.log(`        Thread ID: ${event.threadId}`);
      }
      if (event.content) {
        const contentPreview = event.content.substring(0, 100).replace(/\n/g, ' ');
        console.log(`        Content: ${contentPreview}...`);
      }
    });
    
    console.log('');
  }
  
  await prisma.$disconnect();
}

debugGmailAPIFailure().catch(console.error);