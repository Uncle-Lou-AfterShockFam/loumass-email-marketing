const { PrismaClient } = require('@prisma/client')

// Connect to Neon production database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function checkListAccess() {
  const listId = 'cmf4s4zcf0001la047rkxwd8h'
  
  try {
    // Get the list details
    const list = await prisma.emailList.findUnique({
      where: { id: listId },
      include: {
        user: {
          select: { email: true, name: true, id: true }
        },
        contacts: {
          include: {
            contact: true
          }
        }
      }
    })
    
    if (!list) {
      console.log('❌ List not found!')
      return
    }
    
    console.log('=== LIST DETAILS ===')
    console.log(`List Name: ${list.name}`)
    console.log(`List ID: ${list.id}`)
    console.log(`Owner: ${list.user.email} (${list.user.id})`)
    console.log(`Contact Count: ${list.contacts.length}`)
    console.log('\n✅ List exists in Neon database!')
    console.log('\n⚠️  To access this list, you must be logged in as:')
    console.log(`   Email: ${list.user.email}`)
    
    // Check if there are other users who might need access
    const allUsers = await prisma.user.findMany({
      select: { email: true, id: true, name: true }
    })
    
    console.log('\n=== ALL USERS IN DATABASE ===')
    allUsers.forEach(user => {
      const hasAccess = user.id === list.userId ? '✅ Has access' : '❌ No access'
      console.log(`${user.email} - ${hasAccess}`)
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkListAccess()