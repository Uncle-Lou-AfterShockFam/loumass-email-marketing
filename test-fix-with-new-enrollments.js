const { PrismaClient } = require('@prisma/client')

async function testFixWithNewEnrollments() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🚀 TESTING FIX WITH NEW ENROLLMENTS')
    console.log('=' .repeat(50))
    
    const sequenceId = 'cmffvbebb0005id04l2xdel7k'
    
    // Create enrollment for ljpiotti@gmail.com (will reply)
    const contact1 = await prisma.contact.findFirst({
      where: { email: 'ljpiotti@gmail.com' }
    })
    
    if (contact1) {
      // Delete ALL existing enrollments (including COMPLETED)
      await prisma.sequenceEnrollment.deleteMany({
        where: {
          sequenceId,
          contactId: contact1.id
        }
      })
      
      const enrollment1 = await prisma.sequenceEnrollment.create({
        data: {
          sequenceId,
          contactId: contact1.id,
          currentStep: 0,
          status: 'ACTIVE',
          replyCount: 0
        }
      })
      
      console.log(`\n✅ Created enrollment for ljpiotti@gmail.com`)
      console.log(`   ID: ${enrollment1.id}`)
      console.log(`   Instructions: REPLY to the email when you receive it`)
    }
    
    // Create enrollment for ljpiotti@polarispathways.com (will NOT reply)
    const contact2 = await prisma.contact.findFirst({
      where: { email: 'ljpiotti@polarispathways.com' }
    })
    
    if (contact2) {
      // Delete ALL existing enrollments (including COMPLETED)
      await prisma.sequenceEnrollment.deleteMany({
        where: {
          sequenceId,
          contactId: contact2.id
        }
      })
      
      const enrollment2 = await prisma.sequenceEnrollment.create({
        data: {
          sequenceId,
          contactId: contact2.id,
          currentStep: 0,
          status: 'ACTIVE',
          replyCount: 0
        }
      })
      
      console.log(`\n✅ Created enrollment for ljpiotti@polarispathways.com`)
      console.log(`   ID: ${enrollment2.id}`)
      console.log(`   Instructions: DO NOT REPLY to the email`)
    }
    
    const sequence = await prisma.sequence.findUnique({
      where: { id: sequenceId }
    })
    
    console.log('\n📋 SEQUENCE STRUCTURE:')
    console.log(`   Name: ${sequence.name}`)
    console.log('   Step 0: Initial email')
    console.log('   Step 1: Delay (5 minutes)')
    console.log('   Step 2: Condition (not_replied)')
    console.log('   Step 3: "REPLIED!" email (confusing name - sent when NO reply)')
    console.log('   Step 4: "NO REPLY!" email (confusing name - sent when reply exists)')
    
    console.log('\n🎯 WITH THE FIX:')
    console.log('   ljpiotti@gmail.com (replies) → should get Step 4 "NO REPLY!" email')
    console.log('   ljpiotti@polarispathways.com (no reply) → should get Step 3 "REPLIED!" email')
    
    console.log('\n⏰ WAIT FOR:')
    console.log('   1. Initial emails to be sent (within 1 minute)')
    console.log('   2. Reply to ljpiotti@gmail.com email')
    console.log('   3. Wait 5 minutes for delay')
    console.log('   4. Check which branch emails are sent')
    
    console.log('\n' + '=' .repeat(50))
    console.log('TEST ENROLLMENTS CREATED!')
    
  } catch (error) {
    console.error('❌ ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testFixWithNewEnrollments()