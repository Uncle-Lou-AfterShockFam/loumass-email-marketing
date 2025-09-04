const { PrismaClient } = require('@prisma/client')

// Connect to Neon production database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function recalculateSegments() {
  try {
    console.log('=== RECALCULATING SEGMENT CONTACT COUNTS ===\n')
    
    const userId = 'cmeuwk6x70000jj04gb20w4dk' // ljpiotti@aftershockfam.org
    const listId = 'cmf4s4zcf0001la047rkxwd8h'
    
    // Get all segments for this list
    const segments = await prisma.segment.findMany({
      where: {
        listId: listId,
        userId: userId
      }
    })
    
    console.log(`Found ${segments.length} segments to recalculate:\n`)
    
    // Get all contacts in the list
    const contactListEntries = await prisma.contactList.findMany({
      where: {
        listId: listId
      },
      include: {
        contact: true
      }
    })
    
    const contacts = contactListEntries.map(entry => entry.contact)
    console.log(`Total contacts in list: ${contacts.length}\n`)
    
    for (const segment of segments) {
      console.log(`Processing segment: ${segment.name}`)
      console.log(`  Current count: ${segment.contactCount}`)
      console.log(`  Conditions: ${JSON.stringify(segment.conditions)}`)
      
      let newCount = 0
      
      if (segment.conditions && segment.conditions.rules && segment.conditions.rules.length > 0) {
        const filteredContacts = contacts.filter(contact => {
          return evaluateConditions(contact, segment.conditions)
        })
        newCount = filteredContacts.length
        
        console.log(`  Matching contacts:`)
        filteredContacts.forEach(c => {
          console.log(`    - ${c.email}`)
        })
      }
      
      console.log(`  New count: ${newCount}`)
      
      // Update the segment with new count
      await prisma.segment.update({
        where: { id: segment.id },
        data: { contactCount: newCount }
      })
      
      console.log(`  ✅ Updated!\n`)
    }
    
    console.log('=== RECALCULATION COMPLETE ===')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Helper function to evaluate segment conditions
function evaluateConditions(contact, conditions) {
  if (!conditions?.rules || conditions.rules.length === 0) {
    return false
  }

  const results = conditions.rules.map((rule) => {
    const contactValue = contact[rule.field]?.toString().toLowerCase() || ''
    const ruleValue = rule.value?.toString().toLowerCase() || ''

    switch (rule.operator) {
      case 'equals':
        return contactValue === ruleValue
      case 'notEquals':
        return contactValue !== ruleValue
      case 'contains':
        return contactValue.includes(ruleValue)
      case 'notContains':
        return !contactValue.includes(ruleValue)
      case 'startsWith':
        return contactValue.startsWith(ruleValue)
      case 'endsWith':
        return contactValue.endsWith(ruleValue)
      case 'greaterThan':
        return parseFloat(contactValue) > parseFloat(ruleValue)
      case 'lessThan':
        return parseFloat(contactValue) < parseFloat(ruleValue)
      case 'isEmpty':
        return !contactValue
      case 'isNotEmpty':
        return !!contactValue
      default:
        return false
    }
  })

  return conditions.match === 'all' 
    ? results.every(r => r) 
    : results.some(r => r)
}

recalculateSegments()