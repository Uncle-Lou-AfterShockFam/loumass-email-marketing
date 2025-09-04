const { PrismaClient } = require('@prisma/client')

// Connect to Neon production database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function checkAllData() {
  try {
    console.log('=== COMPLETE NEON DATABASE SUMMARY ===\n')
    
    // Users and their lists
    const users = await prisma.user.findMany({
      include: {
        emailLists: {
          select: { id: true, name: true }
        }
      }
    })
    
    for (const user of users) {
      console.log(`👤 USER: ${user.email} (${user.id})`)
      if (user.emailLists.length > 0) {
        console.log('  📋 Lists:')
        user.emailLists.forEach(list => {
          console.log(`    - ${list.name} (${list.id})`)
        })
      } else {
        console.log('  📋 No lists')
      }
      console.log()
    }
    
    // Contacts and their list associations
    const contacts = await prisma.contact.findMany({
      include: {
        lists: {
          include: {
            list: {
              select: { name: true }
            }
          }
        }
      }
    })
    
    console.log(`📧 CONTACTS (${contacts.length} total):`)
    contacts.forEach(contact => {
      console.log(`  - ${contact.firstName} ${contact.lastName} (${contact.email})`)
      if (contact.lists.length > 0) {
        console.log(`    Lists: ${contact.lists.map(l => l.list.name).join(', ')}`)
      }
    })
    
    // Check ContactList associations
    const contactLists = await prisma.contactList.findMany({
      include: {
        list: { select: { name: true } },
        contact: { select: { email: true } }
      }
    })
    
    console.log(`\n🔗 CONTACT-LIST ASSOCIATIONS (${contactLists.length}):`)
    contactLists.forEach(cl => {
      console.log(`  - ${cl.contact.email} in list "${cl.list.name}"`)
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAllData()