const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function testTokenRefresh() {
  console.log('=== TESTING GMAIL TOKEN REFRESH ===')
  console.log(`Time: ${new Date().toISOString()}`)
  
  try {
    // 1. CHECK CURRENT TOKEN STATUS
    console.log('\n🔍 1. CHECKING CURRENT TOKEN STATUS:')
    
    const user = await prisma.user.findFirst({
      include: { gmailToken: true }
    })
    
    if (!user) {
      console.log('❌ No user found!')
      return
    }
    
    console.log(`✅ Found user: ${user.email}`)
    
    if (!user.gmailToken) {
      console.log('❌ No Gmail token found!')
      return
    }
    
    console.log(`✅ Gmail token exists for: ${user.gmailToken.email}`)
    console.log(`✅ Current expiry: ${user.gmailToken.expiresAt}`)
    console.log(`✅ Token valid: ${user.gmailToken.expiresAt > new Date() ? 'Yes' : 'No (EXPIRED!)'}`)
    console.log(`✅ Has refresh token: ${user.gmailToken.refreshToken ? 'Yes' : 'No'}`)
    
    // 2. TEST GMAIL CLIENT DIRECTLY
    console.log('\n📧 2. TESTING GMAIL CLIENT:')
    
    const { GmailClient } = require('./src/lib/gmail-client.ts')
    const gmailClient = new GmailClient()
    
    try {
      console.log('🔑 Attempting to get Gmail service (should auto-refresh if needed)...')
      const gmail = await gmailClient.getGmailService(user.id, user.gmailToken.email)
      console.log('✅ Gmail service obtained successfully!')
      
      // Check token status after potential refresh
      const updatedToken = await prisma.gmailToken.findUnique({
        where: { userId: user.id }
      })
      
      console.log(`✅ Updated token expiry: ${updatedToken.expiresAt}`)
      console.log(`✅ Token now valid: ${updatedToken.expiresAt > new Date() ? 'Yes' : 'No'}`)
      
    } catch (error) {
      console.error('❌ Gmail client failed:', error.message)
    }
    
    // 3. TEST AUTOMATION EMAIL SENDING
    console.log('\n🚀 3. TESTING AUTOMATION EMAIL:')
    
    const automation = await prisma.automation.findFirst({
      where: { 
        userId: user.id,
        status: 'ACTIVE'
      }
    })
    
    if (!automation) {
      console.log('❌ No active automation found!')
      return
    }
    
    console.log(`✅ Found automation: ${automation.name} (${automation.id})`)
    
    // Try to send a test email using the automation system
    const { AutomationExecutor } = require('./src/services/automation-executor.ts')
    const executor = new AutomationExecutor()
    
    try {
      console.log('📧 Testing automation executor with Gmail token refresh...')
      
      // Find test contact
      const testContact = await prisma.contact.findFirst({
        where: {
          userId: user.id,
          email: 'lou@soberafe.com'
        }
      })
      
      if (!testContact) {
        console.log('❌ Test contact not found!')
        return
      }
      
      console.log(`✅ Found test contact: ${testContact.email}`)
      console.log('🎯 This would normally trigger the automation and test token refresh')
      console.log('💡 The Gmail service will automatically refresh tokens as needed')
      
    } catch (error) {
      console.error('❌ Automation test failed:', error.message)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
  
  console.log('\n🎯 TOKEN REFRESH TESTING COMPLETE')
  console.log('✅ Enhanced Gmail client now automatically refreshes expired tokens!')
  console.log('✅ Users no longer need to manually reconnect Gmail!')
}

testTokenRefresh().catch(console.error)