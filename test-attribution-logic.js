// Test the attribution formatting logic directly
// Mock data to test attribution formatting
const testCases = [
  {
    name: 'Standard format with email in brackets',
    from: 'Louis Piotti <ljpiotti@aftershockfam.org>',
    expected: 'Louis Piotti <ljpiotti@aftershockfam.org>'
  },
  {
    name: 'Just name without email',
    from: 'Louis Piotti',
    senderHeader: '<ljpiotti@aftershockfam.org>',
    expected: 'Louis Piotti <ljpiotti@aftershockfam.org>'
  },
  {
    name: 'Name with email in return-path',
    from: 'Louis Piotti',
    returnPath: 'ljpiotti@aftershockfam.org',
    expected: 'Louis Piotti <ljpiotti@aftershockfam.org>'
  },
  {
    name: 'Just email address',
    from: 'ljpiotti@aftershockfam.org',
    expected: 'ljpiotti@aftershockfam.org <ljpiotti@aftershockfam.org>'
  }
]

console.log('\n=== Testing Attribution Format Logic ===\n')

for (const testCase of testCases) {
  console.log(`📧 Test: ${testCase.name}`)
  console.log(`   From: "${testCase.from}"`)
  
  // Simulate the attribution building logic from gmail-service.ts
  const from = testCase.from
  const formattedDate = 'Wed, Sep 10, 2025'
  const formattedTime = '11:38 PM'
  
  let attribution = ''
  const emailMatch = from.match(/^(.+?)\s*<(.+?)>$/)
  
  if (emailMatch) {
    const fromName = emailMatch[1].trim()
    const fromEmail = emailMatch[2].trim()
    attribution = `On ${formattedDate} at ${formattedTime} ${fromName} <${fromEmail}> wrote:`
  } else {
    const trimmedFrom = from.trim()
    
    // Simulate checking other headers
    let emailAddress = ''
    
    if (trimmedFrom.includes('@')) {
      emailAddress = trimmedFrom
    } else if (testCase.senderHeader) {
      const senderMatch = testCase.senderHeader.match(/<(.+?)>/) || testCase.senderHeader.match(/([^\s]+@[^\s]+)/)
      if (senderMatch) emailAddress = senderMatch[1].trim()
    } else if (testCase.returnPath) {
      const returnMatch = testCase.returnPath.match(/<(.+?)>/) || testCase.returnPath.match(/([^\s]+@[^\s]+)/)
      if (returnMatch) emailAddress = returnMatch[1].trim()
    }
    
    if (emailAddress) {
      if (trimmedFrom === emailAddress) {
        attribution = `On ${formattedDate} at ${formattedTime} ${emailAddress} <${emailAddress}> wrote:`
      } else {
        attribution = `On ${formattedDate} at ${formattedTime} ${trimmedFrom} <${emailAddress}> wrote:`
      }
    } else {
      attribution = `On ${formattedDate} at ${formattedTime} ${trimmedFrom} wrote:`
    }
  }
  
  const expectedFull = `On ${formattedDate} at ${formattedTime} ${testCase.expected} wrote:`
  
  console.log(`   Result: "${attribution}"`)
  console.log(`   Expected: "${expectedFull}"`)
  
  if (attribution === expectedFull) {
    console.log('   ✅ PASS\n')
  } else {
    console.log('   ❌ FAIL\n')
  }
}

console.log('=== Test Complete ===\n')