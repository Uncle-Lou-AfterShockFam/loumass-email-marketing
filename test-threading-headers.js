const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testThreadingHeaders() {
  console.log('=== TESTING THREADING HEADERS ===\n');
  
  // Get the test sequence
  const sequenceId = 'cmfczvcb20001l504320elt76';
  
  const enrollments = await prisma.sequenceEnrollment.findMany({
    where: {
      sequenceId: sequenceId
    },
    select: {
      id: true,
      gmailMessageId: true,
      gmailThreadId: true,
      messageIdHeader: true,
      currentStep: true,
      status: true,
      contact: {
        select: {
          email: true
        }
      }
    }
  });
  
  console.log(`Found ${enrollments.length} enrollments for sequence\n`);
  
  for (const enrollment of enrollments) {
    console.log(`Enrollment: ${enrollment.id}`);
    console.log(`  Contact: ${enrollment.contact.email}`);
    console.log(`  Status: ${enrollment.status}`);
    console.log(`  Current Step: ${enrollment.currentStep}`);
    console.log(`  Gmail Message ID: ${enrollment.gmailMessageId || 'NONE'}`);
    console.log(`  Gmail Thread ID: ${enrollment.gmailThreadId || 'NONE'}`);
    console.log(`  Message-ID Header: ${enrollment.messageIdHeader || 'NONE'}`);
    
    if (enrollment.messageIdHeader) {
      console.log('  ✅ Has Message-ID for threading');
      console.log(`  📧 Formatted for headers: <${enrollment.messageIdHeader}>`);
    } else {
      console.log('  ❌ Missing Message-ID - threading will fail!');
    }
    console.log('');
  }
  
  // Check the sequence steps
  const sequence = await prisma.sequence.findUnique({
    where: { id: sequenceId },
    select: {
      name: true,
      steps: true
    }
  });
  
  console.log(`\nSequence: ${sequence.name}`);
  console.log(`Total steps: ${sequence.steps.length}`);
  
  // Analyze each step
  sequence.steps.forEach((step, index) => {
    console.log(`\nStep ${index}: ${step.type}`);
    if (step.type === 'email') {
      console.log(`  Subject: ${step.subject}`);
      console.log(`  Will thread: ${index > 0 ? 'YES (follow-up)' : 'NO (first email)'}`);
    } else if (step.type === 'delay') {
      console.log(`  Delay: ${step.value} ${step.unit}`);
    }
  });
  
  console.log('\n=== THREADING REQUIREMENTS ===');
  console.log('For proper Gmail threading, follow-up emails must include:');
  console.log('1. In-Reply-To: <message-id-of-first-email>');
  console.log('2. References: <message-id-of-first-email>');
  console.log('3. threadId parameter in Gmail API send request');
  console.log('\nAll three are required for consistent threading across Gmail clients.');
}

testThreadingHeaders()
  .catch(console.error)
  .finally(() => prisma.$disconnect());