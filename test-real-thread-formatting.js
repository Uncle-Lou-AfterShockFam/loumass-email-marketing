const { PrismaClient } = require('@prisma/client')
const { GmailService } = require('./src/services/gmail-service.ts')
const prisma = new PrismaClient()

async function testRealThreadFormatting() {
  console.log('🧪 TESTING: Thread formatting with REAL Gmail thread ID...\n')
  
  // Find the specific enrollment with real thread ID
  const enrollment = await prisma.sequenceEnrollment.findFirst({
    where: {
      gmailThreadId: '1990bdb9da97cdbf'
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
    console.log('❌ Enrollment not found')
    await prisma.$disconnect()
    return
  }
  
  console.log('📧 Testing with REAL enrollment:')
  console.log(`  Contact: ${enrollment.contact.email}`)
  console.log(`  Thread ID: ${enrollment.gmailThreadId}`)
  console.log(`  Current Step: ${enrollment.currentStep}`)
  
  // Test Gmail service with a real thread
  const gmailService = new GmailService()
  
  try {
    console.log('\n🔍 Fetching REAL Gmail thread...')
    const result = await gmailService.getFullThreadHistory(
      enrollment.sequence.user.id,
      enrollment.gmailThreadId
    )
    
    if (result) {
      console.log('✅ REAL thread history fetched successfully!')
      console.log(`  HTML length: ${result.htmlContent.length} characters`)
      console.log(`  Text length: ${result.textContent.length} characters`)
      
      // Check for proper email format with angle brackets
      const emailPattern = /<[^>]+@[^>]+>/
      const hasProperEmailFormat = emailPattern.test(result.htmlContent)
      console.log(`  Has proper email format <email>: ${hasProperEmailFormat ? '✅ YES' : '❌ NO'}`)
      
      // Check for double ellipsis (should not exist)
      const hasDoubleEllipsis = result.htmlContent.includes('......')
      console.log(`  Has double ellipsis issue: ${hasDoubleEllipsis ? '❌ FOUND!' : '✅ None'}`)
      
      // Extract and show attribution lines
      const attributionPattern = /On .* at .* wrote:/g
      const attributions = result.htmlContent.match(attributionPattern)
      
      if (attributions && attributions.length > 0) {
        console.log(`\n📝 Found ${attributions.length} attribution line(s):`)
        attributions.forEach((attr, idx) => {
          console.log(`  ${idx + 1}. "${attr}"`)
          
          // Check if it has angle brackets
          const fullLine = result.htmlContent.substring(
            result.htmlContent.indexOf(attr) - 50,
            result.htmlContent.indexOf(attr) + attr.length + 10
          )
          const hasAngles = fullLine.includes('<') && fullLine.includes('>')
          console.log(`     Has angle brackets: ${hasAngles ? '✅' : '❌'}`)
        })
      } else {
        console.log('\n⚠️ No attribution lines found')
      }
      
      // Show a preview of the formatted thread
      console.log('\n📄 Thread preview (first 500 chars):')
      console.log(result.htmlContent.substring(0, 500))
      console.log('...\n')
      
    } else {
      console.log('❌ getFullThreadHistory returned null')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Stack:', error.stack)
  }
  
  await prisma.$disconnect()
}

testRealThreadFormatting().catch(console.error)