const { PrismaClient } = require('@prisma/client')
const { google } = require('googleapis')

async function testGmailThreadDirect() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Testing Gmail thread fetch directly...')
    
    // Get the user's Gmail token
    const userId = 'cmeuwk6x70000jj04gb20w4dk' // Louis's user ID
    const gmailToken = await prisma.gmailToken.findUnique({
      where: { userId }
    })
    
    if (!gmailToken) {
      console.error('❌ No Gmail token found')
      return
    }
    
    console.log(`✅ Found Gmail token for: ${gmailToken.email}`)
    
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
    
    // Initialize Gmail API
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    
    // Test with the real thread IDs from our enrollments
    const threadIds = [
      '19938599e1b4a417', // lou@soberafe.com thread
      '19938599fca3d70f'  // ljpiotti@gmail.com thread
    ]
    
    for (const threadId of threadIds) {
      console.log(`\n━━━ Testing thread: ${threadId} ━━━`)
      
      try {
        const thread = await gmail.users.threads.get({
          userId: 'me',
          id: threadId,
          format: 'full'
        })
        
        if (!thread.data.messages) {
          console.error(`❌ No messages in thread ${threadId}`)
          continue
        }
        
        console.log(`✅ Found ${thread.data.messages.length} messages in thread`)
        
        // Check each message
        thread.data.messages.forEach((msg, i) => {
          const subject = msg.payload?.headers?.find(h => h.name?.toLowerCase() === 'subject')?.value
          const from = msg.payload?.headers?.find(h => h.name?.toLowerCase() === 'from')?.value
          const to = msg.payload?.headers?.find(h => h.name?.toLowerCase() === 'to')?.value
          const messageId = msg.payload?.headers?.find(h => h.name?.toLowerCase() === 'message-id')?.value
          
          console.log(`\n  Message ${i + 1}:`)
          console.log(`    Subject: ${subject}`)
          console.log(`    From: ${from}`)
          console.log(`    To: ${to}`)
          console.log(`    Message-ID: ${messageId}`)
          
          // Check for body content
          let hasHtml = false
          let hasText = false
          
          const checkParts = (parts) => {
            if (!parts) return
            for (const part of parts) {
              if (part.mimeType === 'text/html' && part.body?.data) {
                hasHtml = true
              } else if (part.mimeType === 'text/plain' && part.body?.data) {
                hasText = true
              } else if (part.parts) {
                checkParts(part.parts)
              }
            }
          }
          
          if (msg.payload?.parts) {
            checkParts(msg.payload.parts)
          } else if (msg.payload?.body?.data) {
            if (msg.payload.mimeType === 'text/html') {
              hasHtml = true
            } else {
              hasText = true
            }
          }
          
          console.log(`    Has HTML: ${hasHtml}`)
          console.log(`    Has Text: ${hasText}`)
        })
        
        // Check what getFullThreadHistory would return
        console.log(`\n📋 Thread History Analysis:`)
        if (thread.data.messages.length === 1) {
          console.log(`  ⚠️  Only 1 message - getFullThreadHistory will return EMPTY!`)
          console.log(`  Because: i < thread.data.messages.length - 1 condition`)
          console.log(`  0 < 0 = FALSE, so no messages included`)
        } else if (thread.data.messages.length === 2) {
          console.log(`  ✅ 2 messages - getFullThreadHistory will include message 1`)
          console.log(`  Message 2 (most recent) will be skipped`)
        } else {
          console.log(`  ✅ ${thread.data.messages.length} messages - will include first ${thread.data.messages.length - 1}`)
        }
        
      } catch (error) {
        console.error(`❌ Error fetching thread ${threadId}:`, error.message)
      }
    }
    
  } catch (error) {
    console.error('💥 ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testGmailThreadDirect()