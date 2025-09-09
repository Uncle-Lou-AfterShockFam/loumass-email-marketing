#!/usr/bin/env node

/**
 * TEST MIME MESSAGE HEADER DECODER
 * 
 * This script will:
 * 1. Build a test MIME message with MailComposer
 * 2. Decode it to check if headers are included
 * 3. Help diagnose why threading isn't working
 */

const nodemailer = require('nodemailer');

async function testMimeHeaders() {
  console.log('🔍 TESTING MIME MESSAGE HEADER GENERATION\n');
  console.log('='.repeat(60));
  
  // Test 1: Basic message without threading
  console.log('\n📧 TEST 1: Basic message (no threading)\n');
  
  let mailOptions1 = {
    from: 'LOUMASS <louis@loumass.com>',
    to: 'test@example.com',
    subject: 'Test Email',
    text: 'This is a test email',
    html: '<p>This is a test email</p>'
  };
  
  // Use MailComposer directly
  const MailComposer = require('nodemailer/lib/mail-composer');
  
  let composer1 = new MailComposer(mailOptions1);
  composer1.compile().build((err, message) => {
    if (err) {
      console.error('Error building message:', err);
      return;
    }
    
    // Decode the message to see headers
    const decoded = message.toString();
    const headers = decoded.split('\r\n\r\n')[0];
    
    console.log('Headers found:');
    headers.split('\r\n').forEach(header => {
      if (header.startsWith('From:') || 
          header.startsWith('To:') || 
          header.startsWith('Subject:') ||
          header.startsWith('Message-ID:')) {
        console.log('  ✅', header);
      }
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('\n📧 TEST 2: Reply message WITH threading headers\n');
    
    // Test 2: Message with threading headers
    let mailOptions2 = {
      from: 'LOUMASS <louis@loumass.com>',
      to: 'test@example.com',
      subject: 'Re: Test Email',
      text: 'This is a reply',
      html: '<p>This is a reply</p>',
      inReplyTo: '<CAMDusAsdcbDhZWdG1NwAE__+ZorWsHGxaQLi83H_VseegJbQRQ@mail.gmail.com>',
      references: '<CAMDusAsdcbDhZWdG1NwAE__+ZorWsHGxaQLi83H_VseegJbQRQ@mail.gmail.com>'
    };
    
    let composer2 = new MailComposer(mailOptions2);
    composer2.compile().build((err2, message2) => {
      if (err2) {
        console.error('Error building message:', err2);
        return;
      }
      
      const decoded2 = message2.toString();
      const headers2 = decoded2.split('\r\n\r\n')[0];
      
      console.log('Headers found:');
      let hasInReplyTo = false;
      let hasReferences = false;
      
      headers2.split('\r\n').forEach(header => {
        if (header.startsWith('From:') || 
            header.startsWith('To:') || 
            header.startsWith('Subject:') ||
            header.startsWith('Message-ID:') ||
            header.startsWith('In-Reply-To:') ||
            header.startsWith('References:')) {
          
          if (header.startsWith('In-Reply-To:')) {
            hasInReplyTo = true;
            console.log('  ✅', header);
          } else if (header.startsWith('References:')) {
            hasReferences = true;
            console.log('  ✅', header);
          } else {
            console.log('  ✅', header);
          }
        }
      });
      
      console.log('\n📊 THREADING HEADER CHECK:');
      console.log('  In-Reply-To header present:', hasInReplyTo ? '✅ YES' : '❌ NO');
      console.log('  References header present:', hasReferences ? '✅ YES' : '❌ NO');
      
      if (hasInReplyTo && hasReferences) {
        console.log('\n✅ MailComposer IS including threading headers correctly!');
        console.log('   The issue must be in how we\'re passing the messageId to gmail-service.ts');
      } else {
        console.log('\n❌ MailComposer is NOT including threading headers!');
        console.log('   This is the root cause of the threading issue.');
      }
      
      console.log('\n' + '='.repeat(60));
      console.log('\n📧 TEST 3: Check what happens with different Message-ID formats\n');
      
      // Test various Message-ID formats
      const testFormats = [
        'CAMDusAsdcbDhZWdG1NwAE__+ZorWsHGxaQLi83H_VseegJbQRQ@mail.gmail.com',
        '<CAMDusAsdcbDhZWdG1NwAE__+ZorWsHGxaQLi83H_VseegJbQRQ@mail.gmail.com>',
        'CAMDusAsdcbDhZWdG1NwAE__+ZorWsHGxaQLi83H_VseegJbQRQ@mail.gmail.com ',
        ' CAMDusAsdcbDhZWdG1NwAE__+ZorWsHGxaQLi83H_VseegJbQRQ@mail.gmail.com',
      ];
      
      testFormats.forEach((format, index) => {
        console.log(`\nTest ${index + 1}: Message-ID = "${format}"`);
        
        let testOptions = {
          from: 'LOUMASS <louis@loumass.com>',
          to: 'test@example.com',
          subject: 'Re: Test',
          text: 'Test',
          inReplyTo: format,
          references: format
        };
        
        let testComposer = new MailComposer(testOptions);
        testComposer.compile().build((err, msg) => {
          if (err) {
            console.log('  ❌ Error:', err.message);
            return;
          }
          
          const decoded = msg.toString();
          const hasInReply = decoded.includes('In-Reply-To:');
          const hasRefs = decoded.includes('References:');
          
          if (hasInReply && hasRefs) {
            console.log('  ✅ Headers included successfully');
            
            // Extract the actual header values
            const lines = decoded.split('\r\n');
            lines.forEach(line => {
              if (line.startsWith('In-Reply-To:')) {
                console.log('     ' + line);
              }
              if (line.startsWith('References:')) {
                console.log('     ' + line);
              }
            });
          } else {
            console.log('  ❌ Headers NOT included');
          }
        });
      });
      
      setTimeout(() => {
        console.log('\n' + '='.repeat(60));
        console.log('\n🎯 CONCLUSIONS:\n');
        console.log('1. MailComposer DOES support In-Reply-To and References headers');
        console.log('2. The headers must be passed in the mailOptions object');
        console.log('3. The Message-ID format should work with or without angle brackets');
        console.log('4. The issue is likely that the messageId is not being passed correctly');
        console.log('   from sequence-service.ts to gmail-service.ts');
        console.log('\n💡 NEXT STEPS:');
        console.log('1. Add logging to verify messageId is passed to gmail-service.ts');
        console.log('2. Check if the messageId validation is blocking the headers');
        console.log('3. Ensure Message-IDs are stored WITHOUT angle brackets');
        console.log('4. Add angle brackets when setting In-Reply-To/References');
      }, 1000);
    });
  });
}

testMimeHeaders().catch(console.error);