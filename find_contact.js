const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function findContact() {
  try {
    console.log('=== FINDING CONTACT ===')
    
    // Find lou@soberafe.com contact
    const contact = await prisma.contact.findFirst({
      where: {
        email: 'lou@soberafe.com'
      }
    })
    
    if (contact) {
      console.log('Found contact:')
      console.log('  ID:', contact.id)
      console.log('  Email:', contact.email)
      console.log('  First Name:', contact.firstName)
      console.log('  User ID:', contact.userId)
    } else {
      console.log('Contact not found')
      
      // List all contacts
      const allContacts = await prisma.contact.findMany({
        take: 5
      })
      
      console.log('\nAll contacts:')
      allContacts.forEach((c, i) => {
        console.log(`  Contact ${i+1}: ${c.id} - ${c.email} (${c.firstName})`)
      })
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

findContact()