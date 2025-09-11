// Test to verify tracking issue in production
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testLiveTracking() {
  console.log('\n=== Testing Live Tracking Issue ===\n')
  
  try {
    // Find the specific enrollment having issues
    const enrollment = await prisma.sequenceEnrollment.findFirst({
      where: {
        sequence: {
          name: {
            contains: 'STAND ALONE'
          }
        },
        contact: {
          email: 'lou@soberafe.com'
        }
      },
      include: {
        sequence: {
          include: {
            user: true
          }
        },
        contact: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })
    
    if (!enrollment) {
      console.log('❌ No enrollment found')
      return
    }
    
    console.log('✅ Found enrollment:')
    console.log(`   ID: ${enrollment.id}`)
    console.log(`   Sequence: ${enrollment.sequence.name}`)
    console.log(`   Contact: ${enrollment.contact.email}`)
    console.log(`   Current Step: ${enrollment.currentStep}`)
    console.log(`   Thread ID: ${enrollment.gmailThreadId}`)
    
    // Test the tracking ID format
    const trackingId = `seq:${enrollment.id}:4:${Date.now()}`
    const encodedTrackingId = Buffer.from(trackingId).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
    
    console.log('\n📧 Tracking ID Analysis:')
    console.log(`   Raw: ${trackingId}`)
    console.log(`   Encoded: ${encodedTrackingId}`)
    
    // Simulate what the tracking prevention should do
    const testHtml = `<div>NO REPLY!</div>
<div><br></div>
Hey Lou!<div><br></div>
<div>Here's our website:<br>
<a href="https://loumassbeta.vercel.app/api/track/click/${encodedTrackingId}?u=https%3A%2F%2Faftershockfam.org">https://aftershockfam.org</a>
</div>
<br>
<div class="gmail_quote gmail_quote_container">
  <div dir="ltr" class="gmail_attr">On Thu, Sep 11, 2025 at 2:14 AM Louis Piotti wrote:<br></div>
  <blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex">
    <html><body>Hey Lou!<div><br></div><div>Here's our website:<br>
    <a href="https://aftershockfam.org">https://aftershockfam.org</a>
    </div></body></html>
  </blockquote>
</div>`
    
    // Test the tracking prevention logic
    console.log('\n🔍 Testing Tracking Prevention:')
    
    // Find where gmail_quote starts
    const quoteStartRegex = /<(?:div|blockquote)[^>]*class="gmail_quote[^"]*"[^>]*>/i
    const quoteMatch = testHtml.match(quoteStartRegex)
    
    if (quoteMatch) {
      const quoteIndex = testHtml.indexOf(quoteMatch[0])
      console.log(`   Quote starts at index: ${quoteIndex}`)
      console.log(`   Quote marker: "${quoteMatch[0].substring(0, 50)}..."`)
      
      const beforeQuote = testHtml.substring(0, quoteIndex)
      const quotedSection = testHtml.substring(quoteIndex)
      
      // Count links in each section
      const linksBefore = (beforeQuote.match(/<a\s+href=/gi) || []).length
      const linksInQuote = (quotedSection.match(/<a\s+href=/gi) || []).length
      
      console.log(`   Links before quote: ${linksBefore}`)
      console.log(`   Links in quoted section: ${linksInQuote}`)
      
      // Check if quoted links have tracking
      const trackedInQuote = quotedSection.includes('/api/track/click/')
      console.log(`   Tracked links in quote: ${trackedInQuote ? '❌ YES (BUG!)' : '✅ NO'}`)
    } else {
      console.log('   ❌ No gmail_quote section found')
    }
    
    // Check the actual email content from the last send
    console.log('\n📨 Checking Last Email Event:')
    const lastEvent = await prisma.emailEvent.findFirst({
      where: {
        contactId: enrollment.contactId,
        sequenceId: enrollment.sequenceId,
        type: 'SENT'
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    if (lastEvent) {
      console.log(`   Event ID: ${lastEvent.id}`)
      console.log(`   Sent at: ${lastEvent.createdAt}`)
      
      // Check for nested tracking in metadata
      if (lastEvent.metadata) {
        const metadataStr = JSON.stringify(lastEvent.metadata)
        const nestedTracking = metadataStr.includes('%2Fapi%2Ftrack%2Fclick')
        console.log(`   Has nested tracking: ${nestedTracking ? '❌ YES' : '✅ NO'}`)
      }
    }
    
    console.log('\n=== Summary ===')
    console.log('The issue is that tracking URLs are being added to quoted content.')
    console.log('The fix should prevent tracking in any content after gmail_quote.')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testLiveTracking()