// Final test for Gmail attribution and nested tracking fixes
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testFinalFix() {
  console.log('\n=== Testing Final Gmail Attribution & Tracking Fix ===\n')
  
  try {
    // Find Louis's account with Gmail integration
    const user = await prisma.user.findFirst({
      where: {
        email: 'ljpiotti@aftershockfam.org',
        gmailToken: {
          isNot: null
        }
      },
      include: {
        gmailToken: true
      }
    })
    
    if (!user) {
      console.log('❌ No user with Gmail integration found')
      return
    }
    
    console.log(`✅ Found user: ${user.email}`)
    
    // Find an enrollment with a real Gmail thread (not test thread)
    const enrollment = await prisma.sequenceEnrollment.findFirst({
      where: {
        contact: {
          userId: user.id
        },
        gmailThreadId: {
          not: null,
          not: {
            startsWith: 'thread-'
          }
        },
        currentStep: {
          gt: 0  // Must be a reply
        }
      },
      include: {
        sequence: true,
        contact: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })
    
    if (!enrollment) {
      console.log('❌ No enrollment with real Gmail thread found')
      return
    }
    
    console.log(`\n✅ Found enrollment:`)
    console.log(`   Sequence: ${enrollment.sequence.name}`)
    console.log(`   Contact: ${enrollment.contact.email}`)
    console.log(`   Thread ID: ${enrollment.gmailThreadId}`)
    console.log(`   Current Step: ${enrollment.currentStep}`)
    
    // Test the Gmail service
    const { GmailService } = require('./src/services/gmail-service')
    const gmailService = new GmailService()
    
    console.log('\n📧 Fetching thread history...')
    const threadHistory = await gmailService.getFullThreadHistory(
      user.id,
      enrollment.gmailThreadId
    )
    
    if (!threadHistory) {
      console.log('❌ Failed to fetch thread history')
      return
    }
    
    console.log('✅ Thread history fetched successfully!')
    console.log(`   HTML length: ${threadHistory.htmlContent.length} chars`)
    
    // Test 1: Check attribution format
    console.log('\n🔍 TEST 1: Attribution Format')
    console.log('=============================')
    
    // Look for attribution with email in angle brackets (both HTML-encoded and plain)
    const attributionRegex1 = /On\s+.+?\s+at\s+\d{1,2}:\d{2}\s*[AP]M\s+(.+?)\s+<(.+?)>\s+wrote:/i
    const attributionRegex2 = /On\s+.+?\s+at\s+\d{1,2}:\d{2}\s*[AP]M\s+(.+?)\s+&lt;(.+?)&gt;\s+wrote:/i
    
    const goodMatches = threadHistory.htmlContent.match(attributionRegex1) || 
                        threadHistory.htmlContent.match(attributionRegex2)
    
    if (goodMatches) {
      console.log('✅ PASS: Found attribution with email in angle brackets!')
      console.log(`   Full match: "${goodMatches[0]}"`)
      console.log(`   Name: ${goodMatches[1]}`)
      console.log(`   Email: ${goodMatches[2]}`)
    } else {
      // Check for old format without email (just name with double space)
      const badRegex = /On\s+.+?\s+at\s+\d{1,2}:\d{2}\s*[AP]M\s+([^<]+?)\s{2,}wrote:/i
      const badMatches = threadHistory.htmlContent.match(badRegex)
      
      if (badMatches) {
        console.log('❌ FAIL: Attribution found but missing email in angle brackets!')
        console.log(`   Found: "${badMatches[0]}"`)
        console.log(`   Name part: "${badMatches[1]}"`)
      } else {
        console.log('⚠️  No attribution line found')
      }
    }
    
    // Test 2: Check for nested tracking links
    console.log('\n🔍 TEST 2: Nested Tracking Links')
    console.log('=================================')
    
    // Look for double-tracked URLs (tracking URL inside another tracking URL)
    const nestedTrackingRegex = /\/api\/track\/click\/[^"]*\?u=[^"]*\/api\/track\/click/i
    const hasNestedTracking = nestedTrackingRegex.test(threadHistory.htmlContent)
    
    if (hasNestedTracking) {
      console.log('❌ FAIL: Found nested tracking links!')
      const match = threadHistory.htmlContent.match(nestedTrackingRegex)
      if (match) {
        console.log(`   Example: "${match[0].substring(0, 100)}..."`)
      }
    } else {
      console.log('✅ PASS: No nested tracking links found')
    }
    
    // Count total tracking links
    const trackingLinks = threadHistory.htmlContent.match(/\/api\/track\/click\//g) || []
    console.log(`   Total tracking links: ${trackingLinks.length}`)
    
    // Test 3: Check for double ellipsis
    console.log('\n🔍 TEST 3: Double Ellipsis')
    console.log('===========================')
    
    const doubleEllipsis = threadHistory.htmlContent.includes('......')
    if (doubleEllipsis) {
      console.log('❌ FAIL: Found double ellipsis (......)')
      const index = threadHistory.htmlContent.indexOf('......')
      console.log(`   At position ${index}`)
      console.log(`   Context: "${threadHistory.htmlContent.substring(index - 30, index + 30)}"`)
    } else {
      console.log('✅ PASS: No double ellipsis found')
    }
    
    // Test 4: Check quoted content structure
    console.log('\n🔍 TEST 4: Quoted Content Structure')
    console.log('====================================')
    
    const hasGmailQuote = threadHistory.htmlContent.includes('class="gmail_quote')
    const hasBlockquote = threadHistory.htmlContent.includes('<blockquote')
    
    console.log(`   Has gmail_quote class: ${hasGmailQuote ? '✅' : '❌'}`)
    console.log(`   Has blockquote tag: ${hasBlockquote ? '✅' : '❌'}`)
    
    // Summary
    console.log('\n📊 SUMMARY')
    console.log('===========')
    
    const tests = {
      'Attribution with email': goodMatches ? '✅ PASS' : '❌ FAIL',
      'No nested tracking': !hasNestedTracking ? '✅ PASS' : '❌ FAIL',
      'No double ellipsis': !doubleEllipsis ? '✅ PASS' : '❌ FAIL',
      'Proper quote structure': (hasGmailQuote && hasBlockquote) ? '✅ PASS' : '⚠️  WARNING'
    }
    
    for (const [test, result] of Object.entries(tests)) {
      console.log(`   ${test}: ${result}`)
    }
    
    const allPassed = Object.values(tests).every(r => r.includes('PASS'))
    console.log(`\n${allPassed ? '🎉 ALL TESTS PASSED!' : '⚠️  Some tests failed. Please review the output above.'}`)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testFinalFix()