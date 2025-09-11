const { PrismaClient } = require('@prisma/client')
const { google } = require('googleapis')

async function checkForRepliesDirectly() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Checking for replies directly...')
    
    // Get the specific enrollment we're testing
    const enrollment = await prisma.sequenceEnrollment.findUnique({
      where: {
        id: 'cmffbj0om000njs04o0gu9x9u'
      },
      include: {
        contact: true,
        sequence: true
      }
    })
    
    if (!enrollment) {
      console.error('❌ Enrollment not found')
      return
    }
    
    console.log(`\n📧 Checking for replies to ${enrollment.contact.email}`)
    console.log(`  Thread ID: ${enrollment.gmailThreadId}`)
    
    // Get Gmail token
    const gmailToken = await prisma.gmailToken.findUnique({
      where: { userId: enrollment.sequence.userId }
    })
    
    if (!gmailToken) {
      console.error('❌ No Gmail token found')
      return
    }
    
    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    )
    
    oauth2Client.setCredentials({
      access_token: gmailToken.accessToken,
      refresh_token: gmailToken.refreshToken,
      expiry_date: gmailToken.expiresAt?.getTime()
    })
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    
    // Get the thread
    console.log(`\n🔍 Fetching thread ${enrollment.gmailThreadId}...`)
    
    const thread = await gmail.users.threads.get({
      userId: 'me',
      id: enrollment.gmailThreadId,
      format: 'full'
    })
    
    if (!thread.data.messages) {
      console.error('❌ No messages in thread')
      return
    }
    
    console.log(`✅ Found ${thread.data.messages.length} messages in thread`)
    
    // Check each message for replies
    let repliesFound = 0
    
    for (let i = 0; i < thread.data.messages.length; i++) {
      const message = thread.data.messages[i]
      const headers = message.payload?.headers || []
      
      const from = headers.find(h => h.name === 'From')?.value
      const subject = headers.find(h => h.name === 'Subject')?.value
      const date = headers.find(h => h.name === 'Date')?.value
      const messageId = headers.find(h => h.name === 'Message-ID')?.value
      const inReplyTo = headers.find(h => h.name === 'In-Reply-To')?.value
      
      // Extract email from "Name <email>" format
      const emailMatch = from?.match(/<(.+)>/)
      const fromEmail = emailMatch ? emailMatch[1] : from
      
      console.log(`\n  Message ${i + 1}:`)
      console.log(`    From: ${fromEmail}`)
      console.log(`    Subject: ${subject}`)
      console.log(`    Date: ${date}`)
      console.log(`    In-Reply-To: ${inReplyTo ? 'YES' : 'NO'}`)
      
      // Check if this is a reply from the contact
      if (fromEmail === enrollment.contact.email && inReplyTo) {
        console.log(`    ✅ THIS IS A REPLY from ${enrollment.contact.email}!`)
        repliesFound++
        
        // Check if we already have this reply recorded
        const existingEmailEvent = await prisma.emailEvent.findFirst({
          where: {
            type: 'REPLIED',
            sequenceId: enrollment.sequenceId,
            contactId: enrollment.contactId,
            eventData: {
              path: ['gmailMessageId'],
              equals: message.id
            }
          }
        })
        
        if (!existingEmailEvent) {
          console.log('    📝 Creating EmailEvent for reply detection...')
          
          // Create EmailEvent for condition evaluation
          await prisma.emailEvent.create({
            data: {
              type: 'REPLIED',
              sequenceId: enrollment.sequenceId,
              contactId: enrollment.contactId,
              timestamp: new Date(date || new Date()),
              eventData: {
                gmailMessageId: message.id,
                gmailThreadId: enrollment.gmailThreadId,
                gmailMessageIdHeader: messageId,
                subject,
                fromEmail,
                date,
                inReplyTo,
                enrollmentId: enrollment.id,
                stepIndex: 0 // Reply to Step 1
              }
            }
          })
          
          // Also create SequenceEvent for tracking
          await prisma.sequenceEvent.create({
            data: {
              enrollmentId: enrollment.id,
              stepIndex: 0,
              eventType: 'REPLIED',
              eventData: {
                gmailMessageId: message.id,
                gmailThreadId: enrollment.gmailThreadId,
                gmailMessageIdHeader: messageId,
                subject,
                fromEmail,
                date,
                inReplyTo,
                timestamp: new Date().toISOString()
              }
            }
          })
          
          // Update enrollment reply stats
          await prisma.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: {
              lastRepliedAt: new Date(date || new Date()),
              replyCount: {
                increment: 1
              }
            }
          })
          
          console.log('    ✅ Reply events created successfully!')
        } else {
          console.log('    ℹ️ Reply already recorded')
        }
      }
    }
    
    console.log(`\n📊 Summary: Found ${repliesFound} replies from ${enrollment.contact.email}`)
    
    // Check the updated status
    const updatedEnrollment = await prisma.sequenceEnrollment.findUnique({
      where: { id: enrollment.id }
    })
    
    console.log('\n📧 Updated enrollment status:')
    console.log(`  Reply Count: ${updatedEnrollment.replyCount}`)
    console.log(`  Last Replied At: ${updatedEnrollment.lastRepliedAt}`)
    
  } catch (error) {
    console.error('💥 ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkForRepliesDirectly()