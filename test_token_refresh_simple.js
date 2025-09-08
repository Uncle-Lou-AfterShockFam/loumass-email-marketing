const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function testTokenRefreshViaAPI() {
  console.log('=== TESTING TOKEN REFRESH VIA AUTOMATION API ===')
  console.log(`Time: ${new Date().toISOString()}`)
  
  try {
    // Use the actual automation executor endpoint
    const response = await fetch('https://loumassbeta.vercel.app/api/automations/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'yRaxumteDNfJ8UDiNI1mpYDrk/Ft+r55MvEh7DKHnZE='}`
      }
    })
    
    console.log('🚀 API Response Status:', response.status)
    
    if (response.status === 200) {
      const result = await response.text()
      console.log('✅ API Response:', result)
      
      // Now check if the token was refreshed
      console.log('\n🔍 CHECKING TOKEN STATUS AFTER API CALL:')
      
      const user = await prisma.user.findFirst({
        include: { gmailToken: true }
      })
      
      if (user?.gmailToken) {
        console.log(`📧 Token expires: ${user.gmailToken.expiresAt}`)
        console.log(`✅ Token now valid: ${user.gmailToken.expiresAt > new Date() ? 'Yes' : 'No'}`)
        
        if (user.gmailToken.expiresAt > new Date()) {
          console.log('🎉 SUCCESS! Token was automatically refreshed!')
        } else {
          console.log('❌ Token is still expired')
        }
      }
      
      // Check if any emails were sent
      console.log('\n📊 CHECKING EMAIL EVENTS:')
      const recentEvents = await prisma.emailEvent.findMany({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 300000) // Last 5 minutes
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 5
      })
      
      console.log(`Found ${recentEvents.length} recent email events:`)
      recentEvents.forEach(event => {
        console.log(`  - ${event.type}: ${event.contactEmail} (${event.emailSubject})`)
      })
      
    } else {
      const errorText = await response.text()
      console.log('❌ API Error:', errorText)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testTokenRefreshViaAPI().catch(console.error)