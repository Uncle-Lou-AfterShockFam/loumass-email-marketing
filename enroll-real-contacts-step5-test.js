const { PrismaClient } = require('@prisma/client')

async function enrollRealContacts() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🚀 Enrolling real contacts to test Step 5 thread history issue...')
    
    // Get the Stand Alone sequence
    const sequence = await prisma.sequence.findUnique({
      where: {
        id: 'cmff9vk640001jr04ndru9n1m'
      },
      include: {
        user: true
      }
    })
    
    if (!sequence) {
      console.error('❌ Sequence not found')
      return
    }
    
    console.log(`✅ Found sequence: ${sequence.name}`)
    
    // Get the real contacts
    const contacts = await prisma.contact.findMany({
      where: {
        email: {
          in: ['ljpiotti@gmail.com', 'lou@soberafe.com']
        },
        userId: sequence.userId
      }
    })
    
    console.log(`\n📧 Found ${contacts.length} contacts:`)
    contacts.forEach(c => console.log(`   - ${c.email} (${c.firstName} ${c.lastName})`))
    
    // Delete any existing active enrollments for clean test
    const deleted = await prisma.sequenceEnrollment.deleteMany({
      where: {
        contactId: {
          in: contacts.map(c => c.id)
        },
        sequenceId: sequence.id,
        status: {
          in: ['ACTIVE', 'PAUSED']
        }
      }
    })
    
    console.log(`\n🧹 Cleared ${deleted.count} existing enrollments`)
    
    // Create new enrollments
    const enrollments = []
    for (const contact of contacts) {
      const enrollment = await prisma.sequenceEnrollment.create({
        data: {
          sequenceId: sequence.id,
          contactId: contact.id,
          currentStep: 0,
          status: 'ACTIVE',
          createdAt: new Date()
        }
      })
      
      enrollments.push(enrollment)
      console.log(`\n✅ Created enrollment: ${enrollment.id}`)
      console.log(`   Contact: ${contact.email}`)
      console.log(`   Current Step: ${enrollment.currentStep}`)
    }
    
    console.log('\n📋 Expected Flow for each enrollment:')
    console.log('   1. Step 1 (email) - Should send and set gmailThreadId')
    console.log('   2. Step 2 (delay 1 minute)')
    console.log('   3. Step 3 (condition - not replied) → TRUE branch')
    console.log('   4. Jump to Step 5 (email) - Should include thread history')
    
    console.log('\n⏰ Timeline:')
    console.log('   - Step 1 will send on next cron run (within 1 minute)')
    console.log('   - Step 5 should send about 1-2 minutes after Step 1')
    
    console.log('\n📊 Monitor these enrollments:')
    enrollments.forEach(e => {
      const contact = contacts.find(c => c.id === e.contactId)
      console.log(`   ${e.id} - ${contact?.email}`)
    })
    
    console.log('\n✉️ These real email addresses should receive:')
    console.log('   1. First email from Step 1')
    console.log('   2. Second email from Step 5 (should include thread history)')
    console.log('\nCheck if Step 5 email includes the previous message in gmail_quote format!')
    
  } catch (error) {
    console.error('💥 ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

enrollRealContacts()