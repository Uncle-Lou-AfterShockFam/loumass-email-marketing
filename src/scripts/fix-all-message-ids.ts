import { prisma } from '@/lib/prisma'
import { GmailFetchService } from '@/services/gmail-fetch-service'

async function fixAllMessageIds() {
  console.log('🔧 Fixing Message-ID headers for ALL enrollments...')
  
  const gmailFetchService = new GmailFetchService()
  
  // Find all enrollments with gmailMessageId but no messageIdHeader
  const enrollments = await prisma.sequenceEnrollment.findMany({
    where: {
      gmailMessageId: { not: null },
      messageIdHeader: null
    },
    include: {
      sequence: true
    }
  })
  
  console.log(`Found ${enrollments.length} enrollments missing Message-ID headers`)
  
  let successCount = 0
  let failCount = 0
  
  for (const enrollment of enrollments) {
    try {
      // Get Gmail token for the user
      const gmailToken = await prisma.gmailToken.findUnique({
        where: { userId: enrollment.sequence.userId }
      })
      
      if (!gmailToken || !enrollment.gmailMessageId) {
        console.log(`⚠️ Skipping enrollment ${enrollment.id} - no Gmail token or message ID`)
        failCount++
        continue
      }
      
      console.log(`\n📧 Processing enrollment ${enrollment.id}`)
      console.log(`   Sequence: ${enrollment.sequence.name}`)
      console.log(`   Gmail Message ID: ${enrollment.gmailMessageId}`)
      
      // Fetch the Message-ID header
      const messageHeaders = await gmailFetchService.getMessageHeaders(
        enrollment.sequence.userId,
        gmailToken.email,
        enrollment.gmailMessageId
      )
      
      if (messageHeaders.messageId) {
        // Update the enrollment with the Message-ID header
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { messageIdHeader: messageHeaders.messageId }
        })
        
        console.log(`   ✅ Message-ID Header: ${messageHeaders.messageId}`)
        successCount++
      } else {
        console.log(`   ❌ No Message-ID found`)
        failCount++
      }
    } catch (error) {
      console.error(`   ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      failCount++
    }
  }
  
  console.log('\n📊 Summary:')
  console.log(`   ✅ Successfully fixed: ${successCount}`)
  console.log(`   ❌ Failed: ${failCount}`)
  console.log(`   📊 Total processed: ${enrollments.length}`)
}

// Run the fix
fixAllMessageIds()
  .catch(console.error)
  .finally(() => prisma.$disconnect())