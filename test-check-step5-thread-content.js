const { PrismaClient } = require('@prisma/client')
const { google } = require('googleapis')

async function checkStep5ThreadContent() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Checking if Step 5 email included thread history...')
    
    // Get the Gmail token
    const userId = 'cmeuwk6x70000jj04gb20w4dk'
    const gmailToken = await prisma.gmailToken.findUnique({
      where: { userId }
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
    const threadId = '199386bf56fbdc7d'
    console.log(`\n📧 Fetching thread: ${threadId}`)
    
    const thread = await gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'full'
    })
    
    if (!thread.data.messages) {
      console.error('❌ No messages in thread')
      return
    }
    
    console.log(`✅ Found ${thread.data.messages.length} messages in thread`)
    
    // Get the most recent message (Step 5)
    const step5Message = thread.data.messages[thread.data.messages.length - 1]
    
    // Extract the HTML body
    let htmlContent = ''
    
    const extractBody = (parts) => {
      if (!parts) return
      for (const part of parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          htmlContent = Buffer.from(part.body.data, 'base64').toString()
        } else if (part.parts) {
          extractBody(part.parts)
        }
      }
    }
    
    if (step5Message.payload?.parts) {
      extractBody(step5Message.payload.parts)
    } else if (step5Message.payload?.body?.data) {
      htmlContent = Buffer.from(step5Message.payload.body.data, 'base64').toString()
    }
    
    // Check for thread history markers
    const hasGmailQuote = htmlContent.includes('gmail_quote')
    const hasBlockquote = htmlContent.includes('<blockquote')
    const hasOnWrote = htmlContent.includes('On ') && htmlContent.includes(' wrote:')
    const hasThreadContent = htmlContent.includes('Quick Loumass test')
    
    console.log('\n📊 Step 5 Email Analysis:')
    console.log(`  Has gmail_quote div: ${hasGmailQuote ? '✅ YES' : '❌ NO'}`)
    console.log(`  Has blockquote tag: ${hasBlockquote ? '✅ YES' : '❌ NO'}`)
    console.log(`  Has "On ... wrote": ${hasOnWrote ? '✅ YES' : '❌ NO'}`)
    console.log(`  Has previous email content: ${hasThreadContent ? '✅ YES' : '❌ NO'}`)
    
    if (hasGmailQuote || hasBlockquote || hasOnWrote || hasThreadContent) {
      console.log('\n✅ SUCCESS! Step 5 included thread history!')
      
      // Show a snippet of the thread history section
      const quoteStart = htmlContent.indexOf('gmail_quote')
      if (quoteStart > 0) {
        const snippet = htmlContent.substring(quoteStart - 20, quoteStart + 200)
        console.log('\nThread history snippet:')
        console.log(snippet)
      }
    } else {
      console.log('\n❌ FAILED! Step 5 did NOT include thread history')
      console.log('\nEmail body length:', htmlContent.length)
      
      // Show the actual content
      if (htmlContent.length < 1000) {
        console.log('\nFull HTML content:')
        console.log(htmlContent)
      } else {
        console.log('\nFirst 500 chars of HTML:')
        console.log(htmlContent.substring(0, 500))
      }
    }
    
  } catch (error) {
    console.error('💥 ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkStep5ThreadContent()