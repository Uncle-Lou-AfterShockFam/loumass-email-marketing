import { PrismaClient } from '@prisma/client';
import { SequenceService } from './src/services/sequence-service';

const prisma = new PrismaClient();
const sequenceService = new SequenceService();

async function processStep() {
  const enrollmentId = 'cmfct1y7e0003jr047tlwar7k';
  
  console.log('🚀 Starting sequence step processing...');
  console.log('Enrollment ID:', enrollmentId);
  
  try {
    // Get current enrollment state
    const enrollment = await prisma.sequenceEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        contact: true,
        sequence: true
      }
    });
    
    if (!enrollment) {
      console.error('Enrollment not found');
      return;
    }
    
    console.log('\n📊 Current enrollment state:');
    console.log('  - Status:', enrollment.status);
    console.log('  - Current Step:', enrollment.currentStep);
    console.log('  - Contact:', enrollment.contact.email);
    console.log('  - Sequence:', enrollment.sequence.name);
    console.log('  - Message-ID stored:', enrollment.messageIdHeader);
    console.log('  - Gmail Thread ID:', enrollment.gmailThreadId);
    
    // Parse steps to see what we're about to process
    const steps = enrollment.sequence.steps as any;
    const currentStep = steps[enrollment.currentStep];
    
    console.log('\n📧 Step to process:');
    console.log('  - Step index:', enrollment.currentStep);
    console.log('  - Step type:', currentStep?.type);
    console.log('  - Step ID:', currentStep?.id);
    
    if (currentStep?.type === 'email') {
      console.log('  - Reply to thread:', currentStep.replyToThread);
      console.log('  - Tracking enabled:', currentStep.trackingEnabled);
      console.log('  - Subject:', currentStep.subject || '(empty - reply)');
      console.log('  - Content preview:', currentStep.content?.substring(0, 50) + '...');
    }
    
    // Process the step
    console.log('\n🔄 Processing step...');
    const result = await sequenceService.processSequenceStep(enrollmentId);
    
    console.log('\n✅ Processing result:', result);
    
    // Check updated state
    const updatedEnrollment = await prisma.sequenceEnrollment.findUnique({
      where: { id: enrollmentId },
      select: {
        currentStep: true,
        status: true,
        lastEmailSentAt: true
      }
    });
    
    console.log('\n📊 Updated enrollment state:');
    console.log('  - New step:', updatedEnrollment?.currentStep);
    console.log('  - Status:', updatedEnrollment?.status);
    console.log('  - Last email sent:', updatedEnrollment?.lastEmailSentAt);
    
  } catch (error) {
    console.error('❌ Error processing step:', error);
  } finally {
    await prisma.$disconnect();
  }
}

processStep();