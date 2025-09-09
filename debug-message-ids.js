#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function debugMessageIds() {
  try {
    console.log('🔍 DEBUGGING MESSAGE-ID THREADING ISSUE')
    console.log('=====================================')
    
    const targetSequenceId = 'cmfc3h0zh0009la04ifdwmjzm'
    const testEmail = 'lou@soberafe.com'
    
    // Also search for enrollments that might have the actual Message-ID from user's headers
    const actualMessageId = 'CAMDusAucYTvKTpMab6TR5iBQ+WNP3A9YvLD2x_JapD=kz7PZow@mail.gmail.com'
    
    console.log('1. Finding enrollments for lou@soberafe.com...')
    const enrollments = await prisma.sequenceEnrollment.findMany({
      where: {
        sequenceId: targetSequenceId,
        contact: {
          email: testEmail
        }
      },
      include: {
        contact: true,
        sequence: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`Found ${enrollments.length} enrollments`)
    
    // Also search for any enrollment with the actual Message-ID from user's headers
    console.log('\n2. Searching for enrollments with the actual Message-ID from user headers...')
    const actualEnrollments = await prisma.sequenceEnrollment.findMany({
      where: {
        messageIdHeader: {
          contains: actualMessageId.replace(/[<>]/g, '') // Remove < > if present
        }
      },
      include: {
        contact: true,
        sequence: true
      }
    })
    console.log(`Found ${actualEnrollments.length} enrollments with the actual Message-ID`)
    
    // Combine both results for analysis
    const allEnrollments = [...enrollments, ...actualEnrollments].reduce((unique, enrollment) => {
      if (!unique.find(e => e.id === enrollment.id)) {
        unique.push(enrollment)
      }
      return unique
    }, [])
    
    for (const enrollment of allEnrollments) {
      console.log('\n=== ENROLLMENT ANALYSIS ===')
      console.log(`ID: ${enrollment.id}`)
      console.log(`Status: ${enrollment.status}`)
      console.log(`Current Step: ${enrollment.currentStep}`)
      console.log(`Created: ${enrollment.createdAt.toISOString()}`)
      console.log(`Last Email Sent: ${enrollment.lastEmailSentAt?.toISOString() || 'Never'}`)
      
      console.log('\n🔍 STORED THREADING INFO:')
      console.log(`Gmail Message ID (internal): ${enrollment.gmailMessageId || 'None'}`)
      console.log(`Gmail Thread ID: ${enrollment.gmailThreadId || 'None'}`)
      console.log(`Message-ID Header (for threading): ${enrollment.messageIdHeader || 'None'}`)
      
      // Check sequence events for this enrollment
      console.log('\n📧 SEQUENCE EVENTS:')
      const events = await prisma.sequenceEvent.findMany({
        where: { enrollmentId: enrollment.id },
        orderBy: { createdAt: 'asc' }
      })
      
      for (const [index, event] of events.entries()) {
        console.log(`  ${index + 1}. ${event.eventType} - Step ${event.stepIndex}`)
        console.log(`     Created: ${event.createdAt.toISOString()}`)
        if (event.eventData) {
          const data = typeof event.eventData === 'string' ? JSON.parse(event.eventData) : event.eventData
          console.log(`     Event Data:`, JSON.stringify(data, null, 6))
        }
      }
      
      // Check campaigns for Message-IDs
      console.log('\n📬 CAMPAIGNS (Message-ID sources):')
      const campaigns = await prisma.campaign.findMany({
        where: {
          sequenceId: targetSequenceId,
          userId: enrollment.sequence.userId
        },
        orderBy: { createdAt: 'asc' }
      })
      
      for (const [index, campaign] of campaigns.entries()) {
        console.log(`  ${index + 1}. Campaign: ${campaign.name}`)
        console.log(`     Created: ${campaign.createdAt?.toISOString()}`)
        console.log(`     Status: ${campaign.status}`)
        console.log(`     Subject: ${campaign.subject || 'None'}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugMessageIds()