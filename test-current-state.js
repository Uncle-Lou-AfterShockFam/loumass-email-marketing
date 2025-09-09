const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCurrentState() {
  try {
    // Create a new enrollment to test
    const contact = await prisma.contact.findFirst({
      where: { 
        email: 'lou@soberafe.com',
        userId: 'cm4nxgla90000c7ydxvxn14y8'
      }
    });
    
    if (!contact) {
      console.log('Contact not found');
      return;
    }

    // Delete any existing enrollment for this contact
    await prisma.sequenceEnrollment.deleteMany({
      where: { 
        sequenceId: 'cmfcxnr6g0001k004ok1p668d',
        contactId: contact.id
      }
    });

    // Create new enrollment
    const enrollment = await prisma.sequenceEnrollment.create({
      data: {
        sequenceId: 'cmfcxnr6g0001k004ok1p668d',
        contactId: contact.id,
        status: 'ACTIVE',
        currentStep: 0
      }
    });

    console.log('Created new enrollment:', enrollment.id);
    console.log('Please monitor at: https://loumassbeta.vercel.app/dashboard/sequences/cmfcxnr6g0001k004ok1p668d');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCurrentState();
