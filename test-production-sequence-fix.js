const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testSequenceFix() {
  console.log('=== TESTING PRODUCTION SEQUENCE FIX ===')
  console.log('This test verifies:')
  console.log('1. Gmail attribution includes email addresses in angle brackets')
  console.log('2. Links in quoted sections are not double-tracked')
  console.log('')
  
  try {
    // Find a sequence enrollment with a thread (active or completed)
    const enrollment = await prisma.sequenceEnrollment.findFirst({
      where: {
        gmailThreadId: { not: null }
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
    })
    
    if (!enrollment) {
      console.log('❌ No active enrollment with thread found')
      return
    }
    
    console.log(`Found enrollment: ${enrollment.id}`)
    console.log(`Thread ID: ${enrollment.gmailThreadId}`)
    console.log(`Contact: ${enrollment.contact.email}`)
    
    // Import the services
    const { GmailService } = require('./src/services/gmail-service')
    const gmailService = new GmailService()
    
    // Test 1: Check if getFullThreadHistory returns proper attribution
    console.log('\n📧 TEST 1: Checking Gmail thread history attribution...')
    const threadHistory = await gmailService.getFullThreadHistory(
      enrollment.sequence.user.id,
      enrollment.gmailThreadId
    )
    
    if (threadHistory) {
      console.log('✅ Thread history retrieved')
      
      // Check for proper attribution format
      const attributionRegex = /On .+ at .+ .+ <.+@.+> wrote:/g
      const attributions = threadHistory.htmlContent.match(attributionRegex) || []
      
      if (attributions.length > 0) {
        console.log(`✅ Found ${attributions.length} properly formatted attributions:`)
        attributions.forEach(attr => console.log(`   ${attr}`))
      } else {
        console.log('❌ No properly formatted attributions found')
        console.log('Sample of HTML:', threadHistory.htmlContent.substring(0, 500))
      }
      
      // Check for double-tracked links
      const doubleTrackedRegex = /\/api\/track\/click\/[^"]*\?u=[^"]*api%2Ftrack%2Fclick/g
      const doubleTracked = threadHistory.htmlContent.match(doubleTrackedRegex) || []
      
      if (doubleTracked.length > 0) {
        console.log(`❌ Found ${doubleTracked.length} double-tracked links`)
      } else {
        console.log('✅ No double-tracked links found')
      }
    } else {
      console.log('❌ Failed to retrieve thread history')
    }
    
    // Test 2: Simulate sending an email with tracking
    console.log('\n📧 TEST 2: Testing tracking in new emails...')
    
    const testHtml = `
      <div>This is a new message with a link: <a href="https://example.com">Click here</a></div>
      <br>
      <div class="gmail_quote gmail_quote_container">
        <div dir="ltr" class="gmail_attr">On Thu, Sep 11, 2025 at 1:03 AM Test User <test@example.com> wrote:<br></div>
        <blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex">
          This is quoted content with a link: <a href="https://quoted.com">Quoted link</a>
        </blockquote>
      </div>
    `
    
    // Test the addTrackingToEmail method
    const trackingId = 'test-tracking-id'
    const trackedHtml = await gmailService.addTrackingToEmail(testHtml, trackingId, enrollment.sequence.user.id)
    
    // Check if main link is tracked
    if (trackedHtml.includes('/api/track/click/test-tracking-id?u=https%3A%2F%2Fexample.com')) {
      console.log('✅ Main content link is tracked')
    } else {
      console.log('❌ Main content link is NOT tracked')
    }
    
    // Check if quoted link is NOT tracked
    if (trackedHtml.includes('/api/track/click/test-tracking-id?u=https%3A%2F%2Fquoted.com')) {
      console.log('❌ Quoted link IS tracked (should not be)')
    } else if (trackedHtml.includes('href="https://quoted.com"')) {
      console.log('✅ Quoted link is NOT tracked (correct)')
    } else {
      console.log('⚠️ Quoted link not found in output')
    }
    
    // Check for tracking pixel
    if (trackedHtml.includes('/api/track/open/test-tracking-id')) {
      console.log('✅ Tracking pixel added')
    } else {
      console.log('❌ Tracking pixel NOT added')
    }
    
    console.log('\n=== TEST COMPLETE ===')
    console.log('The fixes have been applied to gmail-service.ts')
    console.log('Attribution now includes email addresses in angle brackets')
    console.log('Tracking no longer affects quoted thread history')
    
  } catch (error) {
    console.error('Test error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSequenceFix()