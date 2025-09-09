const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDirectProcess() {
  console.log('Testing direct sequence processing...');
  
  // Get the enrollment
  const enrollment = await prisma.sequenceEnrollment.findUnique({
    where: { id: 'cmfct1y7e0003jr047tlwar7k' },
    include: {
      contact: true,
      sequence: {
        include: {
          user: {
            include: {
              gmailToken: true
            }
          }
        }
      }
    }
  });
  
  console.log('Enrollment:', {
    id: enrollment.id,
    currentStep: enrollment.currentStep,
    status: enrollment.status,
    contactEmail: enrollment.contact.email,
    sequenceName: enrollment.sequence.name,
    hasGmailToken: !!enrollment.sequence.user.gmailToken
  });
  
  // Now import and use the sequence service
  const { SequenceService } = require('./src/services/sequence-service.ts');
  const sequenceService = new SequenceService();
  
  console.log('\nProcessing enrollment...');
  const result = await sequenceService.processSequenceStep(enrollment.id);
  console.log('Result:', result);
  
  await prisma.$disconnect();
}

testDirectProcess().catch(console.error);