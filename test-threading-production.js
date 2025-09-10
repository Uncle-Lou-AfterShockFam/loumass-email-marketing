const { PrismaClient } = require('@prisma/client');
const MailComposer = require('nodemailer/lib/mail-composer');
const prisma = new PrismaClient();

async function testProductionThreading() {
  console.log('=== PRODUCTION THREADING TEST ===\n');
  console.log('Deployment completed at:', new Date().toISOString());
  console.log('Testing URL: https://loumassbeta.vercel.app\n');
  
  // Test the mail composer with the exact same approach as our fix
  console.log('1. Testing MailComposer with spread operator approach (our fix):');
  
  const testMessageId = 'CAMDusAvv_LL7v8rg_btYre8BnErQV-7EpncwF8s2ncNZV4pZFg@mail.gmail.com';
  const formattedMessageId = `<${testMessageId}>`;
  
  const threadingHeaders = {
    'In-Reply-To': formattedMessageId,
    'References': formattedMessageId
  };
  
  const mailOptions = {
    from: '"LOUMASS" <sender@example.com>',
    to: 'recipient@example.com',
    subject: 'Re: Test Follow-up',
    text: 'This is a follow-up email',
    html: '<p>This is a follow-up email</p>',
    ...(formattedMessageId ? {
      inReplyTo: formattedMessageId,
      references: formattedMessageId,
      headers: threadingHeaders
    } : {})
  };
  
  const mail = new MailComposer(mailOptions);
  
  await new Promise((resolve) => {
    mail.compile().build((err, message) => {
      if (err) {
        console.error('  ERROR:', err.message);
        resolve();
        return;
      }
      
      const messageString = message.toString();
      const lines = messageString.split('\r\n');
      
      let hasInReplyTo = false;
      let hasReferences = false;
      
      for (const line of lines) {
        if (line.startsWith('In-Reply-To:')) {
          hasInReplyTo = true;
          console.log('  ✅ Found:', line);
        }
        if (line.startsWith('References:')) {
          hasReferences = true;
          console.log('  ✅ Found:', line);
        }
      }
      
      if (!hasInReplyTo || !hasReferences) {
        console.log('  ❌ CRITICAL: Threading headers missing!');
      } else {
        console.log('  ✅ SUCCESS: All threading headers present!\n');
      }
      
      resolve();
    });
  });
  
  // Check recent enrollments for threading data
  console.log('2. Checking recent sequence enrollments for threading data:\n');
  
  const recentEnrollments = await prisma.sequenceEnrollment.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      sequenceId: true,
      createdAt: true,
      status: true,
      currentStep: true,
      gmailMessageId: true,
      gmailThreadId: true,
      messageIdHeader: true,
      contact: {
        select: { email: true }
      },
      sequence: {
        select: { name: true }
      }
    }
  });
  
  if (recentEnrollments.length === 0) {
    console.log('  No enrollments in the last 24 hours.\n');
  } else {
    for (const enrollment of recentEnrollments) {
      console.log(`  Enrollment: ${enrollment.id}`);
      console.log(`    Sequence: ${enrollment.sequence.name}`);
      console.log(`    Contact: ${enrollment.contact.email}`);
      console.log(`    Created: ${enrollment.createdAt.toISOString()}`);
      console.log(`    Status: ${enrollment.status}`);
      console.log(`    Step: ${enrollment.currentStep}`);
      
      if (enrollment.messageIdHeader) {
        console.log(`    ✅ Has Message-ID: ${enrollment.messageIdHeader}`);
        console.log(`    📧 Threading ready: <${enrollment.messageIdHeader}>`);
      } else {
        console.log(`    ❌ Missing Message-ID - threading will fail!`);
      }
      
      if (enrollment.gmailThreadId) {
        console.log(`    Thread ID: ${enrollment.gmailThreadId}`);
      }
      console.log('');
    }
  }
  
  console.log('=== NEXT STEPS ===\n');
  console.log('To test the threading fix:');
  console.log('1. Go to: https://loumassbeta.vercel.app/dashboard/sequences/cmfczvcb20001l504320elt76');
  console.log('2. Click "Settings" tab');
  console.log('3. Enroll a NEW test contact (use a different email)');
  console.log('4. Wait for the first email to send');
  console.log('5. Process the sequence manually or wait for cron');
  console.log('6. Check Gmail - the follow-up should be in the SAME thread!');
  console.log('\n7. Run this script again after enrollment to see the Message-ID stored');
  console.log('\n=== CRITICAL SUCCESS CRITERIA ===');
  console.log('✅ Follow-up emails MUST appear in the same Gmail thread');
  console.log('✅ Headers MUST include In-Reply-To and References');
  console.log('✅ Gmail web UI MUST group emails together');
}

testProductionThreading()
  .catch(console.error)
  .finally(() => prisma.$disconnect());