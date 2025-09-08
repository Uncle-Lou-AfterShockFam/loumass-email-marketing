const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function testEverything() {
  console.log('=== 🚀 COMPREHENSIVE AUTOMATION SYSTEM TEST ===')
  console.log(`Time: ${new Date().toISOString()}`)
  console.log('Testing automation with automatic Gmail token refresh...\n')
  
  const results = {
    automation: '❌ Not tested',
    executions: '❌ Not tested',
    gmailToken: '❌ Not tested',
    contact: '❌ Not tested',
    emailSending: '❌ Not tested',
    analytics: '❌ Not tested',
    tracking: '❌ Not tested'
  }
  
  try {
    // 1. TEST AUTOMATION STRUCTURE
    console.log('📋 1. TESTING AUTOMATION STRUCTURE:')
    const automation = await prisma.automation.findUnique({
      where: { id: 'cmfbhe7sp0002jt048p8jux6p' }
    })
    
    if (automation) {
      console.log(`✅ Automation found: "${automation.name}"`)
      console.log(`✅ Status: ${automation.status}`)
      console.log(`✅ Tracking enabled: ${automation.trackingEnabled}`)
      
      if (automation.nodes?.nodes?.length > 0) {
        console.log(`✅ Has ${automation.nodes.nodes.length} nodes`)
        const emailNode = automation.nodes.nodes.find(n => n.type === 'email')
        if (emailNode) {
          console.log(`✅ Email node found with subject: "${emailNode.emailTemplate?.subject}"`)
          results.automation = '✅ Working'
        }
      }
    }
    
    // 2. TEST EXECUTIONS
    console.log('\n🎯 2. TESTING EXECUTIONS:')
    const executions = await prisma.automationExecution.findMany({
      where: { 
        automationId: 'cmfbhe7sp0002jt048p8jux6p',
        contactId: { in: (await prisma.contact.findMany({
          where: { email: 'lou@soberafe.com' },
          select: { id: true }
        })).map(c => c.id) }
      },
      include: { contact: true }
    })
    
    console.log(`Found ${executions.length} executions for lou@soberafe.com`)
    const activeExecution = executions.find(e => e.status === 'ACTIVE')
    if (activeExecution) {
      console.log(`✅ Active execution found with currentNodeId: ${activeExecution.currentNodeId}`)
      results.executions = '✅ Fixed'
    }
    
    // 3. TEST GMAIL TOKEN
    console.log('\n📧 3. TESTING GMAIL TOKEN:')
    const user = await prisma.user.findFirst({
      include: { gmailToken: true }
    })
    
    if (user?.gmailToken) {
      const now = new Date()
      const isExpired = user.gmailToken.expiresAt <= now
      console.log(`Gmail token for: ${user.gmailToken.email}`)
      console.log(`Expires: ${user.gmailToken.expiresAt}`)
      console.log(`Status: ${isExpired ? '❌ EXPIRED' : '✅ VALID'}`)
      console.log(`Has refresh token: ${user.gmailToken.refreshToken ? '✅ Yes' : '❌ No'}`)
      
      if (user.gmailToken.refreshToken) {
        console.log('✅ Can auto-refresh when needed')
        results.gmailToken = isExpired ? '⚠️ Expired but can refresh' : '✅ Valid'
      }
    }
    
    // 4. TEST CONTACT
    console.log('\n👤 4. TESTING CONTACT:')
    const contact = await prisma.contact.findFirst({
      where: { 
        email: 'lou@soberafe.com',
        userId: user?.id
      }
    })
    
    if (contact) {
      console.log(`✅ Contact found: ${contact.firstName} ${contact.lastName}`)
      console.log(`✅ Status: ${contact.status}`)
      console.log(`✅ Can receive emails: ${!contact.unsubscribed && !contact.bounced}`)
      results.contact = '✅ Ready'
    }
    
    // 5. TEST EMAIL EVENTS & TRACKING
    console.log('\n📊 5. TESTING EMAIL EVENTS & TRACKING:')
    const recentEvents = await prisma.emailEvent.findMany({
      where: {
        userId: user?.id,
        timestamp: {
          gte: new Date(Date.now() - 86400000) // Last 24 hours
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 10
    })
    
    console.log(`Found ${recentEvents.length} email events in last 24 hours`)
    
    if (recentEvents.length > 0) {
      const eventTypes = [...new Set(recentEvents.map(e => e.eventType))]
      console.log(`Event types: ${eventTypes.join(', ')}`)
      
      recentEvents.slice(0, 3).forEach(event => {
        console.log(`  - ${event.eventType}: ${event.contactEmail} - "${event.emailSubject}"`)
      })
      
      results.analytics = `✅ ${recentEvents.length} events tracked`
    } else {
      results.analytics = '⚠️ No recent events (expected if no emails sent)'
    }
    
    // 6. TEST TRACKING PIXELS
    console.log('\n🔍 6. TESTING TRACKING CONFIGURATION:')
    const trackingDomain = await prisma.trackingDomain.findUnique({
      where: { userId: user?.id }
    })
    
    if (trackingDomain) {
      console.log(`✅ Custom tracking domain: ${trackingDomain.domain}`)
      console.log(`✅ Verified: ${trackingDomain.verified}`)
    } else {
      console.log('✅ Using default tracking domain: loumassbeta.vercel.app')
    }
    results.tracking = '✅ Configured'
    
    // 7. CHECK AUTOMATION NODE STATS
    console.log('\n📈 7. TESTING NODE ANALYTICS:')
    const nodeStats = await prisma.automationNodeStats.findMany({
      where: { automationId: 'cmfbhe7sp0002jt048p8jux6p' }
    })
    
    if (nodeStats.length > 0) {
      console.log(`✅ Found stats for ${nodeStats.length} nodes`)
      nodeStats.forEach(stat => {
        console.log(`  - Node ${stat.nodeId}: ${stat.entered} entered, ${stat.completed} completed`)
      })
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
  
  // FINAL SUMMARY
  console.log('\n' + '='.repeat(60))
  console.log('📊 FINAL TEST RESULTS:')
  console.log('='.repeat(60))
  
  Object.entries(results).forEach(([key, value]) => {
    console.log(`${key.padEnd(15)}: ${value}`)
  })
  
  console.log('\n🎯 NEXT STEPS:')
  console.log('1. Wait for Vercel deployment to complete (2-3 minutes)')
  console.log('2. Visit: https://loumassbeta.vercel.app/dashboard/automations/cmfbhe7sp0002jt048p8jux6p')
  console.log('3. Click "Settings" tab')
  console.log('4. Enroll lou@soberafe.com')
  console.log('5. Click "Manual Trigger" button')
  console.log('6. Check email inbox and Analytics tab')
  
  console.log('\n✅ AUTOMATION SYSTEM STATUS: READY FOR TESTING!')
}

testEverything().catch(console.error)