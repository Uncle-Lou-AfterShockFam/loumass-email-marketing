const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testGmailFormatting() {
  console.log('Testing Gmail reply formatting...\n');
  
  // Test date formatting
  const testDate = new Date('2025-09-09T23:02:00-04:00');
  
  // Format date like Gmail
  const dayName = testDate.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/New_York' });
  const month = testDate.toLocaleDateString('en-US', { month: 'short', timeZone: 'America/New_York' });
  const day = testDate.getDate();
  const year = testDate.getFullYear();
  const formattedDate = `${dayName}, ${month} ${day}, ${year}`;
  
  // Format time like Gmail (12-hour with AM/PM)
  let hours = testDate.getHours();
  const minutes = testDate.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedTime = `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  
  const fromName = 'Louis Piotti';
  const fromEmail = 'ljpiotti@aftershockfam.org';
  
  const attribution = `On ${formattedDate} at ${formattedTime} ${fromName} <${fromEmail}> wrote:`;
  
  console.log('Expected Gmail format:');
  console.log('On Tue, Sep 9, 2025 at 11:02 PM Louis Piotti <ljpiotti@aftershockfam.org> wrote:\n');
  
  console.log('Our generated format:');
  console.log(attribution + '\n');
  
  console.log('Match:', attribution === 'On Tue, Sep 9, 2025 at 11:02 PM Louis Piotti <ljpiotti@aftershockfam.org> wrote:');
  
  // Test with actual enrollment data
  const enrollment = await prisma.sequenceEnrollment.findFirst({
    where: {
      gmailThreadId: { not: null },
      currentStep: { gte: 1 }
    },
    include: {
      sequence: true,
      contact: true
    }
  });
  
  if (enrollment) {
    console.log('\nFound enrollment with thread:', enrollment.gmailThreadId);
    console.log('Contact:', enrollment.contact.email);
    console.log('Current step:', enrollment.currentStep);
    
    const steps = typeof enrollment.sequence.steps === 'string' 
      ? JSON.parse(enrollment.sequence.steps) 
      : enrollment.sequence.steps;
    const currentStepData = steps[enrollment.currentStep];
    if (currentStepData?.replyToThread) {
      console.log('This step should reply to thread');
      console.log('Step subject:', currentStepData.subject);
    }
  }
  
  await prisma.$disconnect();
}

testGmailFormatting().catch(console.error);