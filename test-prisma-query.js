const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPrismaQuery() {
  console.log('Testing Prisma query...');
  
  // Test 1: Basic query
  const sequences = await prisma.sequence.findMany({
    where: {
      status: 'ACTIVE',
      enrollments: {
        some: {
          status: 'ACTIVE'
        }
      }
    }
  });
  
  console.log(`Found ${sequences.length} sequences with active enrollments`);
  
  // Test 2: With includes
  const sequencesWithIncludes = await prisma.sequence.findMany({
    where: {
      status: 'ACTIVE',
      enrollments: {
        some: {
          status: 'ACTIVE'
        }
      }
    },
    include: {
      user: {
        include: {
          gmailToken: true
        }
      },
      enrollments: {
        where: {
          status: 'ACTIVE'
        },
        include: {
          contact: true
        }
      }
    }
  });
  
  console.log(`\nWith includes: Found ${sequencesWithIncludes.length} sequences`);
  
  for (const seq of sequencesWithIncludes) {
    console.log(`  - ${seq.name} (${seq.id})`);
    console.log(`    User: ${seq.user.email}`);
    console.log(`    Gmail Token: ${seq.user.gmailToken ? 'Yes' : 'No'}`);
    console.log(`    Active Enrollments: ${seq.enrollments.length}`);
    for (const enr of seq.enrollments) {
      console.log(`      - ${enr.contact.email} at step ${enr.currentStep}`);
    }
  }
  
  await prisma.$disconnect();
}

testPrismaQuery().catch(console.error);