// Test if buildMessage is losing the thread history

const { PrismaClient } = require('@prisma/client')
const { GmailService } = require('./src/services/gmail-service')
const prisma = new PrismaClient()

async function testBuildMessageBug() {
  console.log('=== TESTING BUILDMESSAGE BUG ===\n')
  
  try {
    const enrollment = await prisma.sequenceEnrollment.findFirst({
      where: { id: 'cmff1je430001la047t9zv6wk' },
      include: {
        sequence: true,
        contact: { include: { user: true } }
      }
    })
    
    if (!enrollment) {
      console.log('❌ Enrollment not found')
      return
    }
    
    // Build the exact emailData that would be passed to sendEmail
    const steps = enrollment.sequence.steps
    const step = steps[enrollment.currentStep - 1]
    const content = step.content || '<div>Test content</div>'
    
    const gmailService = new GmailService()
    const fullHistory = await gmailService.getFullThreadHistory(
      enrollment.contact.userId,
      enrollment.gmailThreadId
    )
    
    if (!fullHistory) {
      console.log('❌ No thread history')
      return
    }
    
    // Build finalHtmlContent exactly as sequence processor does
    const finalHtmlContent = `<div dir="ltr">${content}</div>
<br>
${fullHistory.htmlContent}`
    
    console.log('📧 Original HTML Content:')
    console.log(`   Length: ${finalHtmlContent.length}`)
    console.log(`   Has gmail_quote: ${finalHtmlContent.includes('gmail_quote')}`)
    console.log(`   First 200 chars: "${finalHtmlContent.substring(0, 200)}..."`)
    
    // Add tracking exactly as sendEmail does
    const trackingId = 'test-tracking-buildmessage'
    const trackedHtml = await gmailService.addTrackingToEmail(finalHtmlContent, trackingId, enrollment.contact.userId)
    
    console.log('\n🏷️ After Tracking:')
    console.log(`   Length: ${trackedHtml.length}`)
    console.log(`   Has gmail_quote: ${trackedHtml.includes('gmail_quote')}`)
    
    // Create the exact emailData object that sendEmail creates
    const emailData = {
      to: [enrollment.contact.email],
      subject: 'Test Thread History',
      htmlContent: trackedHtml,
      textContent: undefined,
      fromName: 'Louis Piotti',
      campaignId: null,
      contactId: enrollment.contactId,
      trackingId: trackingId,
      threadId: enrollment.gmailThreadId,
      messageId: fullHistory.lastMessageId,
      attachments: []
    }
    
    console.log('\n📤 EmailData Object Created:')
    console.log(`   HTML content length: ${emailData.htmlContent.length}`)
    console.log(`   Has gmail_quote: ${emailData.htmlContent.includes('gmail_quote')}`)
    console.log(`   Thread ID: ${emailData.threadId}`)
    console.log(`   Message ID: ${emailData.messageId}`)
    
    // NOW TEST BUILDMESSAGE DIRECTLY
    console.log('\n🔨 Testing buildMessage directly...')
    
    // Get the gmail address for this user
    const gmailToken = await prisma.gmailToken.findFirst({
      where: { userId: enrollment.contact.userId }
    })
    
    if (!gmailToken) {
      console.log('❌ No Gmail token')
      return
    }
    
    // Call buildMessage directly (we need to access the private method)
    // Let's simulate what buildMessage does without calling it directly
    
    console.log('\n🏗️ Simulating buildMessage process...')
    
    // Create the mailOptions object as buildMessage does
    const mailOptions = {
      from: `${emailData.fromName} <${gmailToken.email}>`,
      to: emailData.to.join(', '),
      subject: emailData.subject,
      text: emailData.textContent || '',
      html: emailData.htmlContent,
      textEncoding: 'base64',
      inReplyTo: emailData.messageId ? `<${emailData.messageId}>` : undefined,
      references: emailData.messageId ? `<${emailData.messageId}>` : undefined
    }
    
    console.log('📋 MailOptions Created:')
    console.log(`   HTML length: ${mailOptions.html.length}`)
    console.log(`   HTML has gmail_quote: ${mailOptions.html.includes('gmail_quote')}`)
    console.log(`   Threading: inReplyTo = ${mailOptions.inReplyTo}`)
    
    // The issue must be in MailComposer - let's test that
    const MailComposer = require('nodemailer/lib/mail-composer')
    
    console.log('\n📦 Testing MailComposer...')
    
    const composer = new MailComposer(mailOptions)
    
    return new Promise((resolve, reject) => {
      composer.build((error, message) => {
        if (error) {
          console.error('❌ MailComposer error:', error)
          reject(error)
          return
        }
        
        console.log('✅ MailComposer succeeded')
        console.log(`   Raw message length: ${message.length}`)
        
        // Convert to base64 as Gmail API expects
        const base64Message = Buffer.from(message).toString('base64url')
        console.log(`   Base64 message length: ${base64Message.length}`)
        
        // Decode a portion to check if content is preserved
        const decoded = message.toString('utf-8')
        const hasGmailQuote = decoded.includes('gmail_quote')
        
        console.log(`   Decoded message has gmail_quote: ${hasGmailQuote}`)
        
        if (!hasGmailQuote) {
          console.log('\n❌ FOUND THE BUG!')
          console.log('MailComposer is stripping the gmail_quote content!')
          
          // Let's find where it goes wrong
          const lines = decoded.split('\n')
          console.log('\nSearching for gmail_quote in decoded message...')
          
          let foundQuoteLines = []
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('gmail_quote')) {
              foundQuoteLines.push(`Line ${i + 1}: ${lines[i]}`)
            }
          }
          
          if (foundQuoteLines.length === 0) {
            console.log('❌ NO gmail_quote found in final message!')
            
            // Check if the HTML content is even there
            const hasAnyHtml = decoded.includes('<div') || decoded.includes('<br>')
            console.log(`   Final message has HTML tags: ${hasAnyHtml}`)
            
            if (!hasAnyHtml) {
              console.log('❌ ALL HTML CONTENT LOST!')
            }
            
          } else {
            console.log(`✅ Found ${foundQuoteLines.length} gmail_quote references:`)
            foundQuoteLines.forEach(line => console.log(`   ${line}`))
          }
          
        } else {
          console.log('✅ MailComposer preserved gmail_quote content')
        }
        
        resolve()
      })
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testBuildMessageBug()