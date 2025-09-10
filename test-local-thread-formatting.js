const { PrismaClient } = require('@prisma/client')
const { GmailService } = require('./src/services/gmail-service.ts')
const prisma = new PrismaClient()

async function testLocalThreadFormatting() {
  console.log('🧪 TESTING: Local thread formatting after fixes...\n')
  
  // Find an enrollment with a thread
  const enrollment = await prisma.sequenceEnrollment.findFirst({
    where: {
      gmailThreadId: { not: null },
      currentStep: { gt: 0 }
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
    },
    orderBy: {
      lastEmailSentAt: 'desc'
    }
  })
  
  if (!enrollment) {
    console.log('❌ No enrollment found with thread')
    await prisma.$disconnect()
    return
  }
  
  console.log('📧 Testing with enrollment:')
  console.log(`  Contact: ${enrollment.contact.email}`)
  console.log(`  Thread ID: ${enrollment.gmailThreadId}`)
  console.log(`  Current Step: ${enrollment.currentStep}`)
  
  // Test Gmail service with the fixed attribution format
  const gmailService = new GmailService()
  
  try {
    console.log('\n🔍 Testing getFullThreadHistory...')
    const result = await gmailService.getFullThreadHistory(
      enrollment.sequence.user.id,
      enrollment.gmailThreadId
    )
    
    if (result) {
      console.log('✅ Thread history fetched successfully!')
      
      // Check for proper email format with angle brackets
      const hasAngularBrackets = result.htmlContent.includes('<') && result.htmlContent.includes('>')
      console.log(`  Has angle brackets around emails: ${hasAngularBrackets ? '✅' : '❌'}`)
      
      // Check for double ellipsis (should not exist)
      const hasDoubleEllipsis = result.htmlContent.includes('......')
      console.log(`  Has double ellipsis issue: ${hasDoubleEllipsis ? '❌ FOUND!' : '✅ None'}`)
      
      // Show a preview of the attribution line
      const attributionMatch = result.htmlContent.match(/On .* at .* wrote:/)
      if (attributionMatch) {
        console.log(`\n📝 Attribution format: "${attributionMatch[0]}"`)
        
        // Extract the full attribution line with context
        const startIdx = result.htmlContent.indexOf(attributionMatch[0])
        const endIdx = startIdx + 200
        const preview = result.htmlContent.substring(startIdx, endIdx)
        console.log(`\n📄 Preview:\n${preview}...`)
      }
      
      // Test EmailEvent fallback format
      console.log('\n🔄 Testing EmailEvent fallback format...')
      const emailEvents = await prisma.emailEvent.findMany({
        where: {
          contactId: enrollment.contact.id,
          sequenceId: enrollment.sequence.id,
          type: 'SENT'
        },
        orderBy: {
          createdAt: 'asc'
        },
        take: 1
      })
      
      if (emailEvents.length > 0) {
        const event = emailEvents[0]
        const user = enrollment.sequence.user
        
        // Format date like in sequenceProcessor
        const eventDate = new Date(event.createdAt).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
        
        const eventTime = new Date(event.createdAt).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
        
        const attribution = `On ${eventDate} at ${eventTime} ${user.name || user.email} <${user.email}> wrote:`
        console.log(`  EmailEvent fallback attribution: "${attribution}"`)
        console.log(`  ✅ Includes angle brackets: ${attribution.includes('<') && attribution.includes('>')}`)
      }
      
    } else {
      console.log('⚠️ getFullThreadHistory returned null (likely fake thread ID)')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
  
  await prisma.$disconnect()
}

testLocalThreadFormatting().catch(console.error)