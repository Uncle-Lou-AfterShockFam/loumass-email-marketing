const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');
const prisma = new PrismaClient();

async function verifyThreading() {
  console.log('Verifying Gmail threading implementation...\n');
  
  // Find an enrollment that's in a reply step
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
  
  const steps = typeof enrollment.sequence.steps === 'string' 
    ? JSON.parse(enrollment.sequence.steps) 
    : enrollment.sequence.steps;
    
  const currentStep = steps[enrollment.currentStep];
  console.log('- Current step type:', currentStep?.type);
  console.log('- Reply to thread:', currentStep?.replyToThread);
  
  // Check if user has Gmail token
  const gmailToken = enrollment.sequence.user.gmailToken;
  if (!gmailToken) {
    console.log('\nNo Gmail token found for user');
    await prisma.$disconnect();
    return;
  }
  
  console.log('\nGmail token found for:', gmailToken.email);
  
  // Try to fetch the thread from Gmail
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: gmailToken.accessToken,
    refresh_token: gmailToken.refreshToken
  });
  
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  
  try {
    const thread = await gmail.users.threads.get({
      userId: 'me',
      id: enrollment.gmailThreadId,
      format: 'metadata',
      metadataHeaders: ['Subject', 'From', 'To', 'Date', 'Message-ID']
    });
    
    console.log('\nThread found with', thread.data.messages.length, 'messages');
    
    // Show last 2 messages
    const messages = thread.data.messages.slice(-2);
    messages.forEach((msg, idx) => {
      const headers = msg.payload.headers;
      const subject = headers.find(h => h.name === 'Subject')?.value;
      const from = headers.find(h => h.name === 'From')?.value;
      const date = headers.find(h => h.name === 'Date')?.value;
      const messageId = headers.find(h => h.name === 'Message-ID')?.value;
      
      console.log(`\nMessage ${idx + 1}:`);
      console.log('  From:', from);
      console.log('  Subject:', subject);
      console.log('  Date:', date);
      console.log('  Message-ID:', messageId);
    });
    
  } catch (error) {
    console.error('\nError fetching thread:', error.message);
  }
  
  await prisma.$disconnect();
}

verifyThreading().catch(console.error);
