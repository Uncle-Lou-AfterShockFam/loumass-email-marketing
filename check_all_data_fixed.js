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
        },
        contacts: {
          select: { id: true, email: true, firstName: true, lastName: true }
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
      
      if (user.contacts.length > 0) {
        console.log(`  📧 Contacts owned by this user: ${user.contacts.length}`)
        user.contacts.forEach(contact => {
          console.log(`    - ${contact.firstName} ${contact.lastName} (${contact.email})`)
        })
      }
      
      console.log()
    }
    
    // Check ContactList associations (contacts in lists)
    const contactLists = await prisma.contactList.findMany({
      include: {
        list: { select: { name: true, userId: true } },
        contact: { select: { email: true, firstName: true, lastName: true } }
      }
    })
    
    console.log(`🔗 CONTACTS IN LISTS (${contactLists.length} associations):`)
    const listGroups = {}
    contactLists.forEach(cl => {
      const listName = cl.list.name
      if (!listGroups[listName]) {
        listGroups[listName] = []
      }
      listGroups[listName].push(`${cl.contact.firstName} ${cl.contact.lastName} (${cl.contact.email})`)
    })
    
    Object.entries(listGroups).forEach(([listName, contacts]) => {
      console.log(`  List "${listName}": ${contacts.length} contacts`)
      contacts.forEach(c => console.log(`    - ${c}`))
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAllData()