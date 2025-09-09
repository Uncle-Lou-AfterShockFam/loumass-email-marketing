const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSequenceFixes() {
  console.log('🧪 Testing Sequence Fixes...\n');
  
  // Get the sequence
  const sequenceId = 'cmfct1p3q0001jr04kkjy4fd1';
  const sequence = await prisma.sequence.findUnique({
    where: { id: sequenceId },
    include: {
      enrollments: {
        include: {
          contact: true
        }
      }
    }
  });
  
  console.log('📧 Sequence:', sequence.name);
  console.log('📊 Enrollments:', sequence.enrollments.length);
  
  // Check the contact - MUST be ljpiotti@gmail.com
  const enrollment = sequence.enrollments[0];
  if (enrollment && enrollment.contact.email !== 'ljpiotti@gmail.com') {
    console.error('❌ ERROR: Test contact is not ljpiotti@gmail.com');
    console.error('   Current contact:', enrollment.contact.email);
    console.error('   STOPPING TEST - Only ljpiotti@gmail.com should be used for testing!');
    await prisma.$disconnect();
    return;
  }
  
  console.log('✅ Test contact verified: ljpiotti@gmail.com\n');
  
  // Check threading data
  console.log('🧵 THREADING CHECK:');
  console.log('  - gmailThreadId:', enrollment.gmailThreadId || 'NONE');
  console.log('  - gmailMessageId:', enrollment.gmailMessageId || 'NONE');
  console.log('  - messageIdHeader:', enrollment.messageIdHeader || 'NONE');
  
  if (enrollment.messageIdHeader && enrollment.messageIdHeader.includes('@')) {
    console.log('  ✅ Valid Message-ID header stored for threading');
  } else {
    console.log('  ⚠️ No valid Message-ID header - threading may not work');
  }
  
  // Check for reply events
  console.log('\n📨 REPLY TRACKING CHECK:');
  const replyEvents = await prisma.sequenceEvent.findMany({
    where: {
      enrollmentId: enrollment.id,
      eventType: 'REPLIED'
    }
  });
  
  console.log('  - Reply events found:', replyEvents.length);
  if (replyEvents.length > 0) {
    console.log('  ✅ Replies are being tracked');
    const lastReply = replyEvents[replyEvents.length - 1];
    console.log('  - Last reply at step:', lastReply.stepIndex);
    console.log('  - Reply data:', JSON.stringify(lastReply.eventData, null, 2).substring(0, 200) + '...');
  } else {
    console.log('  ⚠️ No replies tracked yet');
  }
  
  // Check step executions
  console.log('\n🎯 CONDITION LOGIC CHECK:');
  const executions = await prisma.sequenceStepExecution.findMany({
    where: {
      enrollmentId: enrollment.id
    },
    orderBy: { executedAt: 'asc' }
  });
  
  const steps = Array.isArray(sequence.steps) ? sequence.steps : JSON.parse(sequence.steps);
  console.log('  - Total steps executed:', executions.length);
  
  executions.forEach(exec => {
    const step = steps.find(s => s.id === exec.stepId);
    const isCondition = step?.type === 'condition';
    const isTrueBranch = step?.id === steps[2]?.condition?.trueBranch?.[0];
    const isFalseBranch = step?.id === steps[2]?.condition?.falseBranch?.[0];
    
    console.log(`  Step ${exec.stepIndex}: ${step?.type || 'unknown'}`);
    if (isCondition) {
      console.log('    📊 Condition evaluated');
    } else if (isTrueBranch) {
      console.log('    ✅ TRUE branch taken (NO REPLY detected)');
    } else if (isFalseBranch) {
      console.log('    ✅ FALSE branch taken (REPLY detected)');
    }
  });
  
  // Check tracking in sent emails
  console.log('\n🔍 TRACKING PIXEL/LINK CHECK:');
  const emailEvents = await prisma.sequenceEvent.findMany({
    where: {
      enrollmentId: enrollment.id,
      eventType: 'SENT'
    }
  });
  
  console.log('  - Emails sent:', emailEvents.length);
  
  // Check for open and click events
  const openEvents = await prisma.sequenceEvent.count({
    where: {
      enrollmentId: enrollment.id,
      eventType: 'OPENED'
    }
  });
  
  const clickEvents = await prisma.sequenceEvent.count({
    where: {
      enrollmentId: enrollment.id,
      eventType: 'CLICKED'
    }
  });
  
  console.log('  - Opens tracked:', openEvents);
  console.log('  - Clicks tracked:', clickEvents);
  
  if (emailEvents.length > 0 && (openEvents > 0 || clickEvents > 0)) {
    console.log('  ✅ Tracking is working');
  } else if (emailEvents.length > 0) {
    console.log('  ⚠️ Emails sent but no tracking events yet');
  }
  
  // Summary
  console.log('\n📋 SUMMARY:');
  const issues = [];
  
  if (!enrollment.messageIdHeader || !enrollment.messageIdHeader.includes('@')) {
    issues.push('Threading headers not properly stored');
  }
  
  if (replyEvents.length === 0 && emailEvents.length > 0) {
    issues.push('Reply tracking may not be working (check if reply was sent)');
  }
  
  if (emailEvents.length > 0 && openEvents === 0 && clickEvents === 0) {
    issues.push('Tracking pixels/links may not be working');
  }
  
  if (issues.length === 0) {
    console.log('✅ All systems appear to be working correctly!');
  } else {
    console.log('⚠️ Potential issues detected:');
    issues.forEach(issue => console.log(`  - ${issue}`));
  }
  
  await prisma.$disconnect();
}

testSequenceFixes().catch(console.error);