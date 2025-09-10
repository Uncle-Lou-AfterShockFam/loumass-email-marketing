const MailComposer = require('nodemailer/lib/mail-composer');

async function testThreadingApproaches() {
  console.log('=== TESTING DIFFERENT THREADING APPROACHES ===\n');
  
  const messageId = '<CAMDusAvv_LL7v8rg_btYre8BnErQV-7EpncwF8s2ncNZV4pZFg@mail.gmail.com>';
  
  // Test 1: Headers set at creation time (spread operator)
  console.log('TEST 1: Headers via spread operator at creation');
  const mailOptions1 = {
    from: 'sender@example.com',
    to: 'recipient@example.com',
    subject: 'Re: Test',
    text: 'Test reply',
    html: '<p>Test reply</p>',
    ...(messageId ? {
      inReplyTo: messageId,
      references: messageId,
      headers: {
        'In-Reply-To': messageId,
        'References': messageId
      }
    } : {})
  };
  
  await testMailOptions(mailOptions1, 'Spread operator approach');
  
  // Test 2: Headers added after creation
  console.log('\nTEST 2: Headers added after creation');
  const mailOptions2 = {
    from: 'sender@example.com',
    to: 'recipient@example.com',
    subject: 'Re: Test',
    text: 'Test reply',
    html: '<p>Test reply</p>'
  };
  mailOptions2.inReplyTo = messageId;
  mailOptions2.references = messageId;
  mailOptions2.headers = {
    'In-Reply-To': messageId,
    'References': messageId
  };
  
  await testMailOptions(mailOptions2, 'Post-creation assignment');
  
  // Test 3: Only using headers object
  console.log('\nTEST 3: Only headers object');
  const mailOptions3 = {
    from: 'sender@example.com',
    to: 'recipient@example.com',
    subject: 'Re: Test',
    text: 'Test reply',
    html: '<p>Test reply</p>',
    headers: {
      'In-Reply-To': messageId,
      'References': messageId
    }
  };
  
  await testMailOptions(mailOptions3, 'Headers object only');
  
  // Test 4: Custom headers with different format
  console.log('\nTEST 4: Custom headers array format');
  const mailOptions4 = {
    from: 'sender@example.com',
    to: 'recipient@example.com',
    subject: 'Re: Test',
    text: 'Test reply',
    html: '<p>Test reply</p>',
    headers: [
      { key: 'In-Reply-To', value: messageId },
      { key: 'References', value: messageId }
    ]
  };
  
  await testMailOptions(mailOptions4, 'Headers array format');
}

async function testMailOptions(mailOptions, description) {
  console.log(`\nTesting: ${description}`);
  console.log('Input:', JSON.stringify({
    hasInReplyTo: !!mailOptions.inReplyTo,
    hasReferences: !!mailOptions.references,
    hasHeaders: !!mailOptions.headers,
    headersType: Array.isArray(mailOptions.headers) ? 'array' : typeof mailOptions.headers
  }, null, 2));
  
  const mail = new MailComposer(mailOptions);
  
  return new Promise((resolve) => {
    mail.compile().build((err, message) => {
      if (err) {
        console.error('  ERROR:', err.message);
        resolve();
        return;
      }
      
      const messageString = message.toString();
      const lines = messageString.split('\r\n');
      
      // Find threading headers
      let hasInReplyTo = false;
      let hasReferences = false;
      
      for (const line of lines) {
        if (line.startsWith('In-Reply-To:')) {
          hasInReplyTo = true;
          console.log('  ✅ Found:', line.substring(0, 80));
        }
        if (line.startsWith('References:')) {
          hasReferences = true;
          console.log('  ✅ Found:', line.substring(0, 80));
        }
      }
      
      if (!hasInReplyTo) {
        console.log('  ❌ Missing In-Reply-To header');
      }
      if (!hasReferences) {
        console.log('  ❌ Missing References header');
      }
      
      resolve();
    });
  });
}

testThreadingApproaches().then(() => {
  console.log('\n=== TEST COMPLETE ===');
}).catch(console.error);