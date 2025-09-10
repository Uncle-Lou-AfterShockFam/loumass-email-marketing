require('dotenv').config()
const MailComposer = require('nodemailer/lib/mail-composer')

console.log('=== TESTING GMAIL SEND WITH THREADING HEADERS ===\n')

async function buildMessage(emailData, fromEmail) {
  console.log('Building message with:')
  console.log('  messageId:', emailData.messageId)
  console.log('  threadId:', emailData.threadId)
  
  // CRITICAL FIX: Prepare threading headers BEFORE creating mailOptions
  let threadingHeaders = {}
  let formattedMessageId
  
  if (emailData.messageId && emailData.messageId.includes('@')) {
    console.log('🔗 PREPARING THREADING HEADERS:')
    console.log('  Original Message-ID:', emailData.messageId)
    
    // Format Message-ID with angle brackets
    formattedMessageId = emailData.messageId.trim()
    if (!formattedMessageId.startsWith('<')) {
      formattedMessageId = '<' + formattedMessageId
    }
    if (!formattedMessageId.endsWith('>')) {
      formattedMessageId = formattedMessageId + '>'
    }
    
    console.log('  Formatted Message-ID:', formattedMessageId)
    
    // Set threading headers
    threadingHeaders = {
      'In-Reply-To': formattedMessageId,
      'References': formattedMessageId
    }
    
    console.log('✅ Threading headers prepared:', JSON.stringify(threadingHeaders))
  }
  
  // Create mail options for MailComposer WITH threading built-in
  const mailOptions = {
    from: fromEmail,
    to: emailData.to.join(', '),
    subject: emailData.subject,
    text: emailData.textContent || '',
    html: emailData.htmlContent,
    textEncoding: 'base64',
    // CRITICAL: Set threading properties at creation time if we have them
    ...(formattedMessageId ? {
      inReplyTo: formattedMessageId,
      references: formattedMessageId,
      headers: threadingHeaders
    } : {})
  }
  
  console.log('\n📧 FINAL mailOptions object created:')
  console.log('  - FROM:', mailOptions.from)
  console.log('  - TO:', mailOptions.to)
  console.log('  - SUBJECT:', mailOptions.subject)
  console.log('  - Has inReplyTo:', !!mailOptions.inReplyTo)
  console.log('  - Has references:', !!mailOptions.references)
  console.log('  - Has headers:', !!mailOptions.headers)
  console.log('  - inReplyTo value:', mailOptions.inReplyTo)
  console.log('  - references value:', mailOptions.references)
  
  // FINAL SAFETY CHECK
  if (emailData.messageId && !mailOptions.inReplyTo) {
    console.error('❌ CRITICAL ERROR: messageId provided but headers NOT set!')
  } else if (emailData.messageId && mailOptions.inReplyTo) {
    console.log('✅ THREADING SUCCESS: Headers properly set')
  }
  
  // Use MailComposer to build the MIME message
  const mail = new MailComposer(mailOptions)
  
  return new Promise((resolve, reject) => {
    mail.compile().build((err, message) => {
      if (err) {
        reject(err)
        return
      }
      
      // Check if threading headers are present
      const messageString = message.toString()
      const hasInReplyTo = messageString.includes('In-Reply-To:')
      const hasReferences = messageString.includes('References:')
      
      console.log('\n🔍 HEADER CHECK IN BUILT MESSAGE:')
      console.log('  - Has In-Reply-To header:', hasInReplyTo)
      console.log('  - Has References header:', hasReferences)
      
      // Show the actual headers
      const headerSection = messageString.split('\r\n\r\n')[0]
      console.log('\n📧 ACTUAL GENERATED HEADERS:')
      console.log(headerSection)
      
      if (!hasInReplyTo && mailOptions.inReplyTo) {
        console.error('❌ CRITICAL: In-Reply-To was set but not in MIME message!')
      }
      if (!hasReferences && mailOptions.references) {
        console.error('❌ CRITICAL: References was set but not in MIME message!')
      }
      
      const encodedMessage = Buffer.from(messageString)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
      
      console.log('\n✅ Message compiled successfully')
      resolve(encodedMessage)
    })
  })
}

// Test with real data from the enrollment
async function testRealScenario() {
  // This simulates the exact call from sequence-service.ts
  const emailData = {
    to: ['ljpiotti@polarispathways.com'],
    subject: 'Re: Hey !',
    htmlContent: '<p>This is a follow-up email</p>',
    textContent: undefined,
    trackingId: 'test123',
    sequenceId: 'cmfczvcb20001l504320elt76',
    contactId: 'cmexqqz08000008l6g1vz8ptn',
    threadId: '19930c20d48f07b7',
    messageId: 'CAMDusAtRpX_jNoctdC=6fJxh08Zhv0NkH8AJ_FFWn8vUKx1JqA@mail.gmail.com',
    fromName: undefined
  }
  
  console.log('Testing with real enrollment data:')
  console.log(JSON.stringify(emailData, null, 2))
  console.log('')
  
  const encodedMessage = await buildMessage(emailData, 'test@example.com')
  
  // Decode to check
  const decoded = Buffer.from(
    encodedMessage.slice(0, 2000).replace(/-/g, '+').replace(/_/g, '/') + '==',
    'base64'
  ).toString('utf-8')
  
  console.log('\n📧 First part of base64-decoded message:')
  console.log(decoded)
}

testRealScenario().catch(console.error)