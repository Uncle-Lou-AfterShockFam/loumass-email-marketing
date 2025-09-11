// Debug script to see the actual HTML content
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const fs = require('fs')

async function debugThreadHTML() {
  try {
    const user = await prisma.user.findFirst({
      where: {
        email: 'ljpiotti@aftershockfam.org',
        gmailToken: { isNot: null }
      },
      include: { gmailToken: true }
    })
    
    if (!user) {
      console.log('❌ User not found')
      return
    }
    
    const enrollment = await prisma.sequenceEnrollment.findFirst({
      where: {
        contact: { userId: user.id },
        gmailThreadId: {
          not: null,
          not: { startsWith: 'thread-' }
        },
        currentStep: { gt: 0 }
      },
      include: { sequence: true, contact: true },
      orderBy: { updatedAt: 'desc' }
    })
    
    if (!enrollment) {
      console.log('❌ No enrollment found')
      return
    }
    
    console.log(`\n📧 Thread: ${enrollment.gmailThreadId}`)
    console.log(`   Contact: ${enrollment.contact.email}`)
    console.log(`   Step: ${enrollment.currentStep}`)
    
    const { GmailService } = require('./src/services/gmail-service')
    const gmailService = new GmailService()
    
    const threadHistory = await gmailService.getFullThreadHistory(
      user.id,
      enrollment.gmailThreadId
    )
    
    if (!threadHistory) {
      console.log('❌ Failed to fetch thread history')
      return
    }
    
    // Save HTML to file for inspection
    fs.writeFileSync('thread-history.html', threadHistory.htmlContent)
    console.log('\n✅ HTML saved to thread-history.html')
    console.log(`   Length: ${threadHistory.htmlContent.length} chars`)
    
    // Extract and show any attribution lines
    console.log('\n🔍 Looking for attribution patterns...')
    
    // Pattern 1: In gmail_attr divs
    const attrDivs = threadHistory.htmlContent.match(/<div[^>]*class="gmail_attr"[^>]*>[\s\S]*?<\/div>/gi) || []
    console.log(`\nFound ${attrDivs.length} gmail_attr divs:`)
    attrDivs.forEach((div, i) => {
      console.log(`\nDiv ${i + 1}:`)
      console.log(div.substring(0, 200))
    })
    
    // Pattern 2: "On ... at ... wrote:" anywhere
    const onWrotePattern = /On\s+.{5,50}\s+at\s+\d{1,2}:\d{2}\s*[AP]M\s+.{1,100}\s+wrote:/gi
    const onWroteMatches = threadHistory.htmlContent.match(onWrotePattern) || []
    console.log(`\nFound ${onWroteMatches.length} "On...at...wrote" patterns:`)
    onWroteMatches.forEach((match, i) => {
      console.log(`\nMatch ${i + 1}:`)
      console.log(match)
    })
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

debugThreadHTML()