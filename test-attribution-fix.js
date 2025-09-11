// Test script to verify Gmail attribution format fix
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testAttributionFix() {
  console.log('\n=== Testing Gmail Attribution Fix ===\n')
  
  try {
    // Find a user with Gmail integration
    const user = await prisma.user.findFirst({
      where: {
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
    console.log(`   Gmail: ${user.gmailToken?.email}`)
    
    // Find an enrollment with a real Gmail thread
    const enrollment = await prisma.sequenceEnrollment.findFirst({
      where: {
        contact: {
          userId: user.id
        },
        gmailThreadId: {
          not: null,
          // Only real Gmail thread IDs (hexadecimal)
          not: {
            startsWith: 'thread-'
          }
        },
        currentStep: {
          gt: 0  // Must be a reply, not the first email
        }
      },
      include: {
        sequence: true,
        contact: true
      }
    })
    
    if (!enrollment) {
      console.log('❌ No enrollment with real Gmail thread found for replies')
      return
    }
    
    console.log(`\n✅ Found enrollment:`)
    console.log(`   Sequence: ${enrollment.sequence.name}`)
    console.log(`   Contact: ${enrollment.contact.email}`)
    console.log(`   Thread ID: ${enrollment.gmailThreadId}`)
    console.log(`   Current Step: ${enrollment.currentStep}`)
    
    // Now test the Gmail service to fetch thread history
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
    
    // Check if attribution includes email in angle brackets
    const attributionRegex = /On .+ at .+ (.+) <(.+@.+)> wrote:/
    const matches = threadHistory.htmlContent.match(attributionRegex)
    
    if (matches) {
      console.log('\n✅ ATTRIBUTION FORMAT IS CORRECT!')
      console.log(`   Found: "${matches[0]}"`)
      console.log(`   Name: ${matches[1]}`)
      console.log(`   Email: ${matches[2]}`)
    } else {
      // Check if it's the old format without email
      const oldFormatRegex = /On .+ at .+ (.+) wrote:/
      const oldMatches = threadHistory.htmlContent.match(oldFormatRegex)
      
      if (oldMatches) {
        console.log('\n❌ ATTRIBUTION FORMAT NEEDS FIX')
        console.log(`   Found old format: "${oldMatches[0]}"`)
        console.log(`   Missing email in angle brackets!`)
      } else {
        console.log('\n⚠️  No attribution line found in thread history')
        console.log('   First 500 chars of HTML:')
        console.log(threadHistory.htmlContent.substring(0, 500))
      }
    }
    
    // Also check for double ellipsis issue
    console.log('\n🔍 Checking for double ellipsis...')
    const doubleEllipsis = threadHistory.htmlContent.includes('......')
    if (doubleEllipsis) {
      console.log('❌ Found double ellipsis in thread history!')
      const index = threadHistory.htmlContent.indexOf('......')
      console.log(`   At position ${index}:`)
      console.log(`   Context: "${threadHistory.htmlContent.substring(index - 20, index + 30)}"`)
    } else {
      console.log('✅ No double ellipsis found')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testAttributionFix()