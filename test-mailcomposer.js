const MailComposer = require('nodemailer/lib/mail-composer');

async function testMailComposer() {
  const mailOptions = {
    from: '"Test User" <test@example.com>',
    to: 'recipient@example.com',
    subject: 'Re: Test Thread',
    text: 'This is a test reply',
    html: '<p>This is a test reply</p>',
    // These are the critical headers for threading
    inReplyTo: '<CAMDusAvPO+rKzGfvo98NqsUusq+gsD1vxUBdb+cibKi9i-68AA@mail.gmail.com>',
    references: '<CAMDusAvPO+rKzGfvo98NqsUusq+gsD1vxUBdb+cibKi9i-68AA@mail.gmail.com>',
    // Try also with headers object
    headers: {
      'In-Reply-To': '<CAMDusAvPO+rKzGfvo98NqsUusq+gsD1vxUBdb+cibKi9i-68AA@mail.gmail.com>',
      'References': '<CAMDusAvPO+rKzGfvo98NqsUusq+gsD1vxUBdb+cibKi9i-68AA@mail.gmail.com>'
    }
  };

  console.log('Testing MailComposer with threading headers...\n');
  console.log('Input options:');
  console.log('  inReplyTo:', mailOptions.inReplyTo);
  console.log('  references:', mailOptions.references);
  console.log('  headers:', mailOptions.headers);
  console.log('\n');

  const mail = new MailComposer(mailOptions);
  
  return new Promise((resolve, reject) => {
    mail.compile().build((err, message) => {
      if (err) {
        console.error('Error:', err);
        reject(err);
        return;
      }
      
      const messageString = message.toString();
      
      // Show the headers section
      const headerEnd = messageString.indexOf('\r\n\r\n');
      const headers = messageString.substring(0, headerEnd);
      
      console.log('Generated MIME Headers:');
      console.log('=' .repeat(50));
      console.log(headers);
      console.log('='.repeat(50));
      
      // Check for specific headers
      console.log('\nHeader Check:');
      console.log('  Has In-Reply-To:', messageString.includes('In-Reply-To:'));
      console.log('  Has References:', messageString.includes('References:'));
      
      // Extract specific header values
      const inReplyToMatch = messageString.match(/In-Reply-To: (.+)/);
      const referencesMatch = messageString.match(/References: (.+)/);
      
      if (inReplyToMatch) {
        console.log('  In-Reply-To value:', inReplyToMatch[1]);
      }
      if (referencesMatch) {
        console.log('  References value:', referencesMatch[1]);
      }
      
      resolve(messageString);
    });
  });
}

// Run the test
testMailComposer().catch(console.error);