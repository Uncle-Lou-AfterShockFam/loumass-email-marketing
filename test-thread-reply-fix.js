// Test script to verify thread reply detection is working
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testThreadReplyFix() {
  console.log('🔍 Testing Thread Reply Detection Fix');
  console.log('=====================================\n');

  try {
    // Find the most recent enrollment with a Gmail thread
    const recentEnrollment = await prisma.sequenceEnrollment.findFirst({
      where: {
        gmailThreadId: { not: null },
        currentStep: { gt: 0 }
      },
      orderBy: { updatedAt: 'desc' },
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

    if (!recentEnrollment) {
      console.log('❌ No enrollment with thread found for testing');
      return;
    }

    console.log('📧 Found enrollment to test:');
    console.log(`  ID: ${recentEnrollment.id}`);
    console.log(`  Contact: ${recentEnrollment.contact.email}`);
    console.log(`  Thread ID: ${recentEnrollment.gmailThreadId}`);
    console.log(`  Current Step: ${recentEnrollment.currentStep}`);
    console.log(`  Last Email: ${recentEnrollment.lastEmailSentAt}\n`);

    // Import the services
    const { GmailFetchService } = require('./src/services/gmail-fetch-service');
    const gmailFetchService = new GmailFetchService();

    console.log('🔄 Fetching thread messages...');
    const threadMessages = await gmailFetchService.getThreadMessages(
      recentEnrollment.sequence.user.id,
      recentEnrollment.sequence.user.email,
      recentEnrollment.gmailThreadId
    );

    if (!threadMessages || threadMessages.length === 0) {
      console.log('❌ No messages found in thread');
      return;
    }

    console.log(`✅ Found ${threadMessages.length} messages in thread:\n`);

    // Display all messages
    threadMessages.forEach((msg, idx) => {
      console.log(`📨 Message ${idx + 1}:`);
      console.log(`  From: ${msg.from}`);
      console.log(`  Subject: ${msg.subject}`);
      console.log(`  Date: ${msg.date}`);
      
      // Extract email for analysis
      let fromEmail = '';
      const angleMatch = msg.from.match(/<([^>]+)>/);
      if (angleMatch && angleMatch[1]) {
        fromEmail = angleMatch[1].trim().toLowerCase();
      } else if (msg.from.includes('@')) {
        fromEmail = msg.from.replace(/['"]/g, '').trim().toLowerCase();
      }
      
      console.log(`  Extracted Email: ${fromEmail}`);
      
      // Check if it's from the recipient
      const isFromRecipient = fromEmail === recentEnrollment.contact.email.toLowerCase();
      const isOurEmail = fromEmail === recentEnrollment.sequence.user.email?.toLowerCase() ||
                         fromEmail === recentEnrollment.sequence.user.gmailToken?.email?.toLowerCase();
      
      if (isFromRecipient) {
        console.log(`  ✅ THIS IS THE RECIPIENT'S REPLY!`);
        console.log(`  Body preview: ${(msg.textBody || msg.htmlBody || '').substring(0, 150)}...`);
      } else if (isOurEmail) {
        console.log(`  ℹ️ This is our sent email`);
      } else {
        console.log(`  ⚠️ Unknown sender`);
      }
      console.log('');
    });

    // Now test the actual processor logic
    console.log('🧪 Testing reply detection logic...');
    
    let recipientReply = null;
    const contact = recentEnrollment.contact;
    const user = recentEnrollment.sequence.user;
    
    for (let i = threadMessages.length - 1; i >= 0; i--) {
      const msg = threadMessages[i];
      
      let fromEmail = '';
      const angleMatch = msg.from.match(/<([^>]+)>/);
      if (angleMatch && angleMatch[1]) {
        fromEmail = angleMatch[1].trim().toLowerCase();
      } else if (msg.from.includes('@')) {
        fromEmail = msg.from.replace(/['"]/g, '').trim().toLowerCase();
      }
      
      const contactEmailNormalized = contact.email.trim().toLowerCase();
      const isFromRecipient = fromEmail === contactEmailNormalized;
      const userEmail = user.email?.toLowerCase() || '';
      const gmailTokenEmail = user.gmailToken?.email?.toLowerCase() || '';
      const isOurOwnEmail = fromEmail === userEmail || fromEmail === gmailTokenEmail;
      
      if (!isOurOwnEmail && isFromRecipient) {
        recipientReply = msg;
        break;
      }
    }
    
    if (recipientReply) {
      console.log('✅ SUCCESS: Found recipient reply!');
      console.log(`  From: ${recipientReply.from}`);
      console.log(`  Body: ${(recipientReply.textBody || recipientReply.htmlBody || '').substring(0, 200)}...`);
    } else {
      console.log('⚠️ No recipient reply found in thread');
      console.log('  This might be correct if the recipient hasn\'t replied yet');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testThreadReplyFix().catch(console.error);