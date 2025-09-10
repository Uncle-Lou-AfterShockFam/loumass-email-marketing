const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSequenceThreadDebugging() {
  console.log('🔍 DEBUGGING: Sequence processor thread logic...\n');
  
  // Find an enrollment that should have thread history
  const enrollment = await prisma.sequenceEnrollment.findFirst({
    where: {
      gmailThreadId: { not: null },
      currentStep: { gt: 0 }
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
    console.log('❌ No enrollment found with thread ID and currentStep > 0');
    await prisma.$disconnect();
    return;
  }
  
  console.log('📧 FOUND ENROLLMENT:');
  console.log(`  Contact: ${enrollment.contact.email}`);
  console.log(`  Current Step: ${enrollment.currentStep}`);
  console.log(`  Gmail Thread ID: ${enrollment.gmailThreadId}`);
  console.log(`  Last Email Sent: ${enrollment.lastEmailSentAt}`);
  console.log(`  User: ${enrollment.sequence.user.email}`);
  
  // Check the exact conditions that sequence processor uses
  console.log('\n🎯 CONDITION CHECK:');
  console.log(`  enrollment.currentStep > 0: ${enrollment.currentStep > 0}`);
  console.log(`  enrollment.gmailThreadId exists: ${!!enrollment.gmailThreadId}`);
  console.log(`  Both conditions met: ${enrollment.currentStep > 0 && enrollment.gmailThreadId}`);
  
  // Check Gmail token
  const gmailToken = enrollment.sequence.user.gmailToken;
  if (gmailToken) {
    const isExpired = gmailToken.expiresAt < new Date();
    console.log(`\n🔑 GMAIL TOKEN STATUS:`);
    console.log(`  Email: ${gmailToken.email}`);
    console.log(`  Expires: ${gmailToken.expiresAt}`);
    console.log(`  Is Expired: ${isExpired}`);
    console.log(`  Minutes until expiry: ${Math.round((gmailToken.expiresAt - new Date()) / (1000 * 60))}`);
  } else {
    console.log(`\n❌ NO GMAIL TOKEN FOUND!`);
  }
  
  // Now test calling getFullThreadHistory exactly like sequence processor does
  if (enrollment.currentStep > 0 && enrollment.gmailThreadId) {
    console.log(`\n🚀 TESTING getFullThreadHistory call...`);
    
    try {
      const { GmailService } = require('./src/services/gmail-service.ts');
      const gmailService = new GmailService();
      
      console.log(`📞 Calling: gmailService.getFullThreadHistory("${enrollment.sequence.user.id}", "${enrollment.gmailThreadId}")`);
      const fullHistory = await gmailService.getFullThreadHistory(
        enrollment.sequence.user.id, 
        enrollment.gmailThreadId
      );
      
      if (fullHistory) {
        console.log(`✅ SUCCESS! Got thread history:`);
        console.log(`  HTML length: ${fullHistory.htmlContent.length}`);
        console.log(`  Text length: ${fullHistory.textContent.length}`);
        console.log(`  HTML preview: ${fullHistory.htmlContent.substring(0, 200)}...`);
      } else {
        console.log(`❌ FAILED! getFullThreadHistory returned null`);
      }
      
    } catch (error) {
      console.error(`💥 ERROR calling getFullThreadHistory:`, error.message);
      console.error(`Full error:`, error);
    }
  }
  
  await prisma.$disconnect();
}

testSequenceThreadDebugging().catch(console.error);