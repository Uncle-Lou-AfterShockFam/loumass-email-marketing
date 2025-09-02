import { prisma } from '@/lib/prisma'
import { GmailFetchService } from '@/services/gmail-fetch-service'

async function fixMessageIdHeaders() {
  console.log('🔧 Fixing Message-ID headers for enrollments...')
  
  const gmailFetchService = new GmailFetchService()
  
  // Find enrollments with gmailMessageId but no messageIdHeader
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
  
  for (const enrollment of enrollments) {
    try {
      // Get Gmail token for the user
      const gmailToken = await prisma.gmailToken.findUnique({
        where: { userId: enrollment.sequence.userId }
      })
      
      if (!gmailToken || !enrollment.gmailMessageId) {
        console.log(`Skipping enrollment ${enrollment.id} - no Gmail token or message ID`)
        continue
      }
      
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
        
        console.log(`✅ Fixed enrollment ${enrollment.id}:`)
        console.log(`   Sequence: ${enrollment.sequence.name}`)
        console.log(`   Gmail Message ID: ${enrollment.gmailMessageId}`)
        console.log(`   Message-ID Header: ${messageHeaders.messageId}`)
      } else {
        console.log(`⚠️  No Message-ID found for enrollment ${enrollment.id}`)
      }
    } catch (error) {
      console.error(`Failed to fix enrollment ${enrollment.id}:`, error)
    }
  }
  
  console.log('✅ Message-ID header fix complete!')
}

// Run the fix
fixMessageIdHeaders()
  .catch(console.error)
  .finally(() => prisma.$disconnect())