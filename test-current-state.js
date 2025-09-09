const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCurrentState() {
  try {
    // First, find any contact to test with
    const contact = await prisma.contact.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    
    if (!contact) {
      console.log('Contact not found');
      return;
    }

    console.log('Found contact:', contact.email);

    // Find a sequence to test with
    const sequence = await prisma.sequence.findFirst({
      where: {
        userId: contact.userId,
        sequenceType: 'STANDALONE'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!sequence) {
      console.log('No standalone sequence found');
      return;
    }

    console.log('Found sequence:', sequence.name);

    // Delete any existing enrollment for this contact
    await prisma.sequenceEnrollment.deleteMany({
      where: { 
        sequenceId: sequence.id,
        contactId: contact.id
      }
    });

    // Create new enrollment
    const enrollment = await prisma.sequenceEnrollment.create({
      data: {
        sequenceId: sequence.id,
        contactId: contact.id,
        status: 'ACTIVE',
        currentStep: 0
      }
    });

    console.log('Created new enrollment:', enrollment.id);
    console.log('Sequence ID:', sequence.id);
    console.log('Contact:', contact.email);
    console.log('Please monitor at: http://localhost:3000/dashboard/sequences/' + sequence.id);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCurrentState();
