const { PrismaClient } = require('@prisma/client')

// Connect to Neon production database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function checkNeonData() {
  try {
    console.log('=== NEON DATABASE DATA ===\n')
    
    // Check users
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true }
    })
    console.log(`Users (${users.length}):`)
    users.forEach(u => console.log(`  - ${u.email} (${u.id})`))
    
    // Check lists
    const lists = await prisma.emailList.findMany({
      select: { id: true, name: true, userId: true }
    })
    console.log(`\nEmail Lists (${lists.length}):`)
    lists.forEach(l => console.log(`  - ${l.name} (${l.id}) - User: ${l.userId}`))
    
    // Check contacts
    const contacts = await prisma.contact.count()
    console.log(`\nTotal Contacts: ${contacts}`)
    
    // Check segments
    const segments = await prisma.segment.findMany({
      select: { id: true, name: true, listId: true }
    })
    console.log(`\nSegments (${segments.length}):`)
    segments.forEach(s => console.log(`  - ${s.name} (${s.id}) - List: ${s.listId}`))
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkNeonData()