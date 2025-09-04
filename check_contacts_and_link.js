const { PrismaClient } = require('@prisma/client')

// Connect to Neon production database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function checkAndLinkContacts() {
  try {
    console.log('=== CHECKING ALL CONTACTS ===\n')
    
    const userId = 'cmeuwk6x70000jj04gb20w4dk' // ljpiotti@aftershockfam.org
    const listId = 'cmf4s4zcf0001la047rkxwd8h'
    
    // Get all contacts owned by this user
    const allContacts = await prisma.contact.findMany({
      where: {
        userId: userId
      }
    })
    
    console.log(`Found ${allContacts.length} contacts owned by user:\n`)
    allContacts.forEach(contact => {
      console.log(`  - ${contact.email} (${contact.firstName} ${contact.lastName})`)
    })
    
    // Check which ones are in the list
    console.log('\n=== CHECKING LIST ASSOCIATIONS ===\n')
    
    for (const contact of allContacts) {
      const association = await prisma.contactList.findFirst({
        where: {
          contactId: contact.id,
          listId: listId
        }
      })
      
      if (association) {
        console.log(`✅ ${contact.email} is in the list`)
      } else {
        console.log(`❌ ${contact.email} is NOT in the list - ADDING NOW...`)
        
        // Add the contact to the list
        await prisma.contactList.create({
          data: {
            contactId: contact.id,
            listId: listId,
            status: 'active',
            subscribedAt: new Date()
          }
        })
        
        console.log(`   ✅ Added to list!`)
      }
    }
    
    // Verify the associations
    console.log('\n=== VERIFYING LIST CONTENTS ===\n')
    
    const contactsInList = await prisma.contactList.findMany({
      where: {
        listId: listId
      },
      include: {
        contact: true
      }
    })
    
    console.log(`List now contains ${contactsInList.length} contacts:`)
    contactsInList.forEach(entry => {
      console.log(`  - ${entry.contact.email}`)
    })
    
    // Find contacts that match "ljpiotti"
    console.log('\n=== CONTACTS MATCHING "ljpiotti" ===\n')
    const matching = contactsInList.filter(entry => 
      entry.contact.email.toLowerCase().includes('ljpiotti')
    )
    
    console.log(`Found ${matching.length} matching contacts:`)
    matching.forEach(entry => {
      console.log(`  - ${entry.contact.email}`)
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAndLinkContacts()