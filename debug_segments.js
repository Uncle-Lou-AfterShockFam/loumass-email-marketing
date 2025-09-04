const { PrismaClient } = require('@prisma/client')

// Connect to Neon production database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function debugSegments() {
  try {
    console.log('=== DEBUGGING SEGMENT FILTERING ===\n')
    
    // Get the list
    const listId = 'cmf4s4zcf0001la047rkxwd8h'
    const userId = 'cmeuwk6x70000jj04gb20w4dk' // ljpiotti@aftershockfam.org
    
    // Get all contacts in the list through ContactList relation
    const contactListEntries = await prisma.contactList.findMany({
      where: {
        listId: listId,
        list: {
          userId: userId
        }
      },
      include: {
        contact: true
      }
    })
    
    console.log(`Found ${contactListEntries.length} contacts in list:\n`)
    
    contactListEntries.forEach((entry, idx) => {
      const contact = entry.contact
      console.log(`Contact ${idx + 1}:`)
      console.log(`  ID: ${contact.id}`)
      console.log(`  Email: ${contact.email}`)
      console.log(`  First Name: ${contact.firstName}`)
      console.log(`  Last Name: ${contact.lastName}`)
      console.log(`  Company: ${contact.company}`)
      console.log(`  Status: ${contact.status}`)
      console.log()
    })
    
    // Test the condition
    const testCondition = {
      match: 'any',
      rules: [{
        field: 'email',
        operator: 'contains',
        value: 'ljpiotti'
      }]
    }
    
    console.log('Testing condition:', JSON.stringify(testCondition, null, 2))
    console.log()
    
    const contacts = contactListEntries.map(entry => entry.contact)
    
    // Test filtering
    const filteredContacts = contacts.filter(contact => {
      const result = evaluateConditions(contact, testCondition)
      console.log(`  ${contact.email}: ${result ? '✅ MATCHES' : '❌ NO MATCH'}`)
      
      // Debug the evaluation
      const emailValue = contact.email?.toString().toLowerCase() || ''
      const searchValue = 'ljpiotti'
      console.log(`    - email value: "${emailValue}"`)
      console.log(`    - search value: "${searchValue}"`)
      console.log(`    - includes: ${emailValue.includes(searchValue)}`)
      console.log()
      
      return result
    })
    
    console.log(`\nFiltered contacts: ${filteredContacts.length}`)
    filteredContacts.forEach(c => {
      console.log(`  - ${c.email}`)
    })
    
    // Check segments in database
    console.log('\n=== SEGMENTS IN DATABASE ===')
    const segments = await prisma.segment.findMany({
      where: {
        listId: listId,
        userId: userId
      }
    })
    
    segments.forEach(segment => {
      console.log(`\nSegment: ${segment.name}`)
      console.log(`  ID: ${segment.id}`)
      console.log(`  Contact Count: ${segment.contactCount}`)
      console.log(`  Conditions: ${JSON.stringify(segment.conditions)}`)
    })
    
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

    console.log(`    Evaluating: ${rule.field} ${rule.operator} "${rule.value}"`)
    console.log(`      Contact value: "${contactValue}"`)
    console.log(`      Rule value: "${ruleValue}"`)

    switch (rule.operator) {
      case 'equals':
        return contactValue === ruleValue
      case 'notEquals':
        return contactValue !== ruleValue
      case 'contains':
        const result = contactValue.includes(ruleValue)
        console.log(`      Contains result: ${result}`)
        return result
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

debugSegments()