#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function findUser() {
  try {
    console.log('Finding existing users...\n')
    
    const users = await prisma.user.findMany({
      take: 5,
      select: {
        id: true,
        email: true,
        name: true
      }
    })
    
    if (users.length === 0) {
      console.log('No users found in database')
      return null
    }
    
    console.log('Found users:')
    users.forEach(user => {
      console.log(`ID: ${user.id}`)
      console.log(`Email: ${user.email}`)
      console.log(`Name: ${user.name || 'N/A'}`)
      console.log('---')
    })
    
    // Return the first user ID
    return users[0].id
    
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

findUser()