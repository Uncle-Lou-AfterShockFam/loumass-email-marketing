const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');
const prisma = new PrismaClient();

async function testFullThreadHistory() {
  console.log('Testing full thread history fetching...\n');
  
  // Find an enrollment with a thread
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
  
  const gmailToken = enrollment.sequence.user.gmailToken;
  if (!gmailToken) {
    console.log('No Gmail token found');
    await prisma.$disconnect();
    return;
  }
  
  // Set up Gmail API
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: gmailToken.accessToken,
    refresh_token: gmailToken.refreshToken
  });
  
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  
  // Fetch the thread
  const thread = await gmail.users.threads.get({
    userId: 'me',
    id: enrollment.gmailThreadId,
    format: 'full'
  });
  
  if (!thread.data.messages || thread.data.messages.length === 0) {
    console.log('No messages in thread');
    await prisma.$disconnect();
    return;
  }
  
  console.log(`\nFound ${thread.data.messages.length} messages in thread`);
  
  // Build the complete thread history
  let fullHtmlContent = '';
  
  // Helper function to extract content
  const extractContent = (parts) => {
    let html = '';
    let text = '';
    
    for (const part of parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        html = Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.mimeType === 'text/plain' && part.body?.data) {
        text = Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.parts) {
        const nested = extractContent(part.parts);
        html = html || nested.html;
        text = text || nested.text;
      }
    }
    
    return { html, text };
  };
  
  // Process all messages in reverse order (newest to oldest) to build nested structure
  for (let i = thread.data.messages.length - 1; i >= 0; i--) {
    const message = thread.data.messages[i];
    
    // Extract headers
    const fromHeader = message.payload?.headers?.find(h => h.name?.toLowerCase() === 'from');
    const from = fromHeader?.value || 'Unknown Sender';
    
    const dateHeader = message.payload?.headers?.find(h => h.name?.toLowerCase() === 'date');
    const date = dateHeader?.value ? new Date(dateHeader.value) : new Date();
    
    const subjectHeader = message.payload?.headers?.find(h => h.name?.toLowerCase() === 'subject');
    const subject = subjectHeader?.value;
    
    console.log(`\nMessage ${thread.data.messages.length - i}:`);
    console.log('  From:', from);
    console.log('  Date:', date.toLocaleString());
    console.log('  Subject:', subject);
    
    // Extract message content
    let messageHtml = '';
    let messageText = '';
    
    if (message.payload?.parts) {
      const content = extractContent(message.payload.parts);
      messageHtml = content.html;
      messageText = content.text;
    } else if (message.payload?.body?.data) {
      const content = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
      if (message.payload.mimeType === 'text/html') {
        messageHtml = content;
      } else {
        messageText = content;
      }
    }
    
    // Only include messages that aren't the most recent (we're replying to the most recent)
    if (i < thread.data.messages.length - 1 && (messageHtml || messageText)) {
      // Format date like Gmail
      const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'America/New_York'
      });
      
      const formattedTime = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/New_York'
      }).replace(' ', ' ');
      
      // Build attribution line
      const attribution = `On ${formattedDate} at ${formattedTime} ${from} wrote:`;
      console.log('  Attribution:', attribution);
      
      // Build the quoted content with proper nesting
      const quotedHtml = `<div class="gmail_quote gmail_quote_container">
  <div dir="ltr" class="gmail_attr">${attribution}<br></div>
  <blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex">
    ${messageHtml}${fullHtmlContent ? '\n' + fullHtmlContent : ''}
  </blockquote>
</div>`;
      
      fullHtmlContent = quotedHtml;
    }
  }
  
  console.log('\n=== Full Thread History Built ===');
  console.log('HTML content length:', fullHtmlContent.length);
  
  // Show structure preview
  console.log('\nHTML Preview (first 1500 chars):');
  console.log(fullHtmlContent.substring(0, 1500));
  
  // Count nested quotes
  const quoteCount = (fullHtmlContent.match(/gmail_quote_container/g) || []).length;
  console.log(`\nTotal quoted messages: ${quoteCount}`);
  
  await prisma.$disconnect();
}

testFullThreadHistory().catch(console.error);