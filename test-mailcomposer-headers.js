const MailComposer = require('nodemailer/lib/mail-composer')

console.log('=== TESTING MAILCOMPOSER HEADER GENERATION ===\n')

async function testMailComposer() {
  const testCases = [
    {
      name: 'Test 1: With In-Reply-To and References',
      options: {
        from: 'test@example.com',
        to: 'recipient@example.com',
        subject: 'Re: Test Thread',
        html: '<p>This is a follow-up email</p>',
        inReplyTo: '<CAMDusAtRpX_jNoctdC=6fJxh08Zhv0NkH8AJ_FFWn8vUKx1JqA@mail.gmail.com>',
        references: '<CAMDusAtRpX_jNoctdC=6fJxh08Zhv0NkH8AJ_FFWn8vUKx1JqA@mail.gmail.com>'
      }
    },
    {
      name: 'Test 2: With headers object',
      options: {
        from: 'test@example.com',
        to: 'recipient@example.com',
        subject: 'Re: Test Thread',
        html: '<p>This is a follow-up email</p>',
        headers: {
          'In-Reply-To': '<CAMDusAtRpX_jNoctdC=6fJxh08Zhv0NkH8AJ_FFWn8vUKx1JqA@mail.gmail.com>',
          'References': '<CAMDusAtRpX_jNoctdC=6fJxh08Zhv0NkH8AJ_FFWn8vUKx1JqA@mail.gmail.com>'
        }
      }
    },
    {
      name: 'Test 3: With both direct properties and headers',
      options: {
        from: 'test@example.com',
        to: 'recipient@example.com',
        subject: 'Re: Test Thread',
        html: '<p>This is a follow-up email</p>',
        inReplyTo: '<CAMDusAtRpX_jNoctdC=6fJxh08Zhv0NkH8AJ_FFWn8vUKx1JqA@mail.gmail.com>',
        references: '<CAMDusAtRpX_jNoctdC=6fJxh08Zhv0NkH8AJ_FFWn8vUKx1JqA@mail.gmail.com>',
        headers: {
          'In-Reply-To': '<CAMDusAtRpX_jNoctdC=6fJxh08Zhv0NkH8AJ_FFWn8vUKx1JqA@mail.gmail.com>',
          'References': '<CAMDusAtRpX_jNoctdC=6fJxh08Zhv0NkH8AJ_FFWn8vUKx1JqA@mail.gmail.com>'
        }
      }
    },
    {
      name: 'Test 4: Without threading headers',
      options: {
        from: 'test@example.com',
        to: 'recipient@example.com',
        subject: 'New Email',
        html: '<p>This is a new email</p>'
      }
    }
  ]

  for (const testCase of testCases) {
    console.log(`\n${testCase.name}`)
    console.log('=' .repeat(50))
    console.log('Input options:')
    console.log(JSON.stringify({
      ...testCase.options,
      html: '[HTML CONTENT]'
    }, null, 2))

    try {
      const mail = new MailComposer(testCase.options)
      
      const message = await new Promise((resolve, reject) => {
        mail.compile().build((err, message) => {
          if (err) {
            reject(err)
            return
          }
          resolve(message)
        })
      })

      const messageString = message.toString()
      
      // Extract headers from the message
      const headerSection = messageString.split('\r\n\r\n')[0]
      
      console.log('\nGenerated headers:')
      console.log(headerSection)
      
      // Check for threading headers
      const hasInReplyTo = messageString.includes('In-Reply-To:')
      const hasReferences = messageString.includes('References:')
      
      console.log('\nHeader check:')
      console.log(`✓ Has In-Reply-To: ${hasInReplyTo}`)
      console.log(`✓ Has References: ${hasReferences}`)
      
      if (hasInReplyTo) {
        const inReplyToMatch = messageString.match(/In-Reply-To: (.+)/i)
        console.log(`  In-Reply-To value: ${inReplyToMatch ? inReplyToMatch[1] : 'NOT FOUND'}`)
      }
      
      if (hasReferences) {
        const referencesMatch = messageString.match(/References: (.+)/i)
        console.log(`  References value: ${referencesMatch ? referencesMatch[1] : 'NOT FOUND'}`)
      }
      
      if (testCase.options.inReplyTo && !hasInReplyTo) {
        console.log('❌ ERROR: inReplyTo was set but not in MIME message!')
      }
      if (testCase.options.references && !hasReferences) {
        console.log('❌ ERROR: references was set but not in MIME message!')
      }
      
    } catch (error) {
      console.error('Error:', error.message)
    }
  }
}

testMailComposer().then(() => {
  console.log('\n=== TEST COMPLETE ===')
}).catch(console.error)