const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function diagnoseAutomationComplete() {
  const automationId = 'cmfbhe7sp0002jt048p8jux6p'
  
  console.log(`=== COMPLETE AUTOMATION DIAGNOSIS ===`)
  console.log(`Automation ID: ${automationId}`)
  console.log(`Time: ${new Date().toISOString()}`)
  console.log(`Purpose: Find out why lou@soberafe.com isn't receiving emails`)
  
  try {
    // 1. CHECK AUTOMATION STRUCTURE
    console.log(`\n🔍 1. AUTOMATION STRUCTURE:`)
    const automation = await prisma.automation.findUnique({
      where: { id: automationId }
    })
    
    if (!automation) {
      console.log('❌ Automation not found!')
      return
    }
    
    console.log(`✅ Name: "${automation.name}"`)
    console.log(`✅ Status: ${automation.status}`)
    console.log(`✅ Trigger: ${automation.triggerEvent}`)
    console.log(`✅ Tracking: ${automation.trackingEnabled}`)
    console.log(`✅ Stats: ${automation.totalEntered} entered, ${automation.currentlyActive} active`)
    
    // Check nodes structure
    if (automation.nodes && automation.nodes.nodes) {
      console.log(`✅ Nodes: ${automation.nodes.nodes.length}`)
      automation.nodes.nodes.forEach(node => {
        console.log(`   - ${node.id}: ${node.type} (${node.name})`)
        if (node.type === 'email') {
          console.log(`     Subject: "${node.emailTemplate?.subject}"`)
          console.log(`     Tracking: ${node.emailTemplate?.trackingEnabled}`)
        }
      })
      console.log(`✅ Edges: ${automation.nodes.edges?.length || 0}`)
    }
    
    // 2. CHECK EXECUTIONS
    console.log(`\n🚀 2. AUTOMATION EXECUTIONS:`)
    const executions = await prisma.automationExecution.findMany({
      where: { automationId },
      include: {
        contact: {
          select: { email: true, firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`Found ${executions.length} executions:`)
    executions.forEach((exec, i) => {
      console.log(`  ${i+1}. ${exec.contact.email} (${exec.contact.firstName} ${exec.contact.lastName})`)
      console.log(`     Status: ${exec.status}`)
      console.log(`     Current Node: ${exec.currentNodeId || 'None'}`)
      console.log(`     Created: ${exec.createdAt}`)
      console.log(`     Updated: ${exec.updatedAt}`)
      
      if (exec.contact.email === 'lou@soberafe.com') {
        console.log(`     🎯 THIS IS OUR TEST CONTACT!`)
        if (exec.currentNodeId) {
          console.log(`     ✅ Has currentNodeId: ${exec.currentNodeId}`)
        } else {
          console.log(`     ❌ Missing currentNodeId - execution stuck!`)
        }
      }
    })
    
    // 3. CHECK USER AND GMAIL TOKEN
    console.log(`\n📧 3. GMAIL INTEGRATION:`)
    const user = await prisma.user.findUnique({
      where: { id: automation.userId },
      include: { gmailToken: true }
    })
    
    if (!user) {
      console.log(`❌ User not found!`)
    } else {
      console.log(`✅ User: ${user.email}`)
      
      if (!user.gmailToken) {
        console.log(`❌ NO GMAIL TOKEN - emails cannot be sent!`)
      } else {
        console.log(`✅ Gmail token exists`)
        console.log(`✅ Gmail email: ${user.gmailToken.email}`)
        console.log(`✅ Token expires: ${user.gmailToken.expiresAt}`)
        console.log(`✅ Token valid: ${user.gmailToken.expiresAt > new Date() ? 'Yes' : 'No (EXPIRED!)'}`)
      }
    }
    
    // 4. CHECK EMAIL EVENTS
    console.log(`\n📊 4. EMAIL EVENTS:`)
    const emailEvents = await prisma.emailEvent.findMany({
      where: {
        userId: automation.userId,
        timestamp: {
          gte: new Date(Date.now() - 3600000 * 24) // Last 24 hours
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 10
    })
    
    console.log(`Found ${emailEvents.length} email events in last 24 hours:`)
    emailEvents.forEach((event, i) => {
      console.log(`  ${i+1}. ${event.eventType} - ${event.contactEmail}`)
      console.log(`     Subject: "${event.emailSubject}"`)
      console.log(`     Time: ${event.timestamp}`)
    })
    
    // 5. CHECK CONTACTS
    console.log(`\n👤 5. TEST CONTACT STATUS:`)
    const testContact = await prisma.contact.findFirst({
      where: {
        userId: automation.userId,
        email: 'lou@soberafe.com'
      }
    })
    
    if (!testContact) {
      console.log(`❌ Test contact 'lou@soberafe.com' NOT FOUND!`)
      console.log(`💡 The contact must exist before enrollment can work`)
    } else {
      console.log(`✅ Contact found: ${testContact.firstName} ${testContact.lastName}`)
      console.log(`✅ Status: ${testContact.status}`)
      console.log(`✅ Unsubscribed: ${testContact.unsubscribed}`)
      console.log(`✅ Bounced: ${testContact.bounced}`)
    }
    
    // 6. DIAGNOSIS SUMMARY
    console.log(`\n🎯 DIAGNOSIS SUMMARY:`)
    
    const issues = []
    
    if (automation.status !== 'ACTIVE') {
      issues.push(`❌ Automation is ${automation.status}, not ACTIVE`)
    }
    
    if (!user?.gmailToken) {
      issues.push(`❌ No Gmail token - emails cannot be sent`)
    } else if (user.gmailToken.expiresAt <= new Date()) {
      issues.push(`❌ Gmail token expired - emails cannot be sent`)
    }
    
    if (!testContact) {
      issues.push(`❌ Test contact doesn't exist in database`)
    }
    
    const brokenExecutions = executions.filter(e => !e.currentNodeId && e.status === 'ACTIVE')
    if (brokenExecutions.length > 0) {
      issues.push(`❌ ${brokenExecutions.length} executions missing currentNodeId`)
    }
    
    const testExecution = executions.find(e => e.contact.email === 'lou@soberafe.com')
    if (testExecution && !testExecution.currentNodeId) {
      issues.push(`❌ Test contact execution missing currentNodeId`)
    }
    
    if (issues.length === 0) {
      console.log(`✅ No obvious issues found - automation should work!`)
      console.log(`💡 Try manual execution or check automation executor logs`)
    } else {
      console.log(`Found ${issues.length} issues:`)
      issues.forEach(issue => console.log(`  ${issue}`))
    }
    
    // 7. RECOMMENDED ACTIONS
    console.log(`\n🚀 RECOMMENDED ACTIONS:`)
    if (!user?.gmailToken || user.gmailToken.expiresAt <= new Date()) {
      console.log(`1. Reconnect Gmail integration in dashboard`)
    }
    if (!testContact) {
      console.log(`2. Create contact 'lou@soberafe.com' in dashboard`)
    }
    if (brokenExecutions.length > 0) {
      console.log(`3. Run fix_enrollment_directly.js again to repair executions`)
    }
    console.log(`4. Test manual enrollment in dashboard`)
    console.log(`5. Check automation executor cron job is running`)
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

diagnoseAutomationComplete().catch(console.error)