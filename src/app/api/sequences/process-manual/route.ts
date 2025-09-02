import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SequenceService } from '@/services/sequence-service'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

// Manual endpoint to process sequences for testing
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`\n🔧 ==== MANUAL SEQUENCE PROCESSING STARTED ====`)
    console.log(`User: ${session.user.email}`)
    console.log(`Time: ${new Date().toISOString()}`)

    const body = await request.json().catch(() => ({}))
    const { enrollmentId, sequenceId } = body

    const sequenceService = new SequenceService()
    let results: any = {
      timestamp: new Date().toISOString(),
      mode: 'manual',
      user: session.user.email,
      processed: 0,
      sent: 0,
      completed: 0,
      errors: 0,
      details: [] as any[]
    }

    if (enrollmentId) {
      // Process specific enrollment
      console.log(`🎯 Processing specific enrollment: ${enrollmentId}`)
      
      const enrollment = await prisma.sequenceEnrollment.findUnique({
        where: { id: enrollmentId },
        include: {
          sequence: {
            include: { user: true }
          },
          contact: true
        }
      })

      if (!enrollment) {
        return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
      }

      // Check ownership
      if (enrollment.sequence.userId !== session.user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      try {
        const result = await sequenceService.processSequenceStep(enrollmentId)
        results.processed = 1
        
        if (result.success) {
          if (result.sentStep) results.sent = 1
          if (result.completed) results.completed = 1
          
          results.details.push({
            enrollmentId,
            contactEmail: enrollment.contact.email,
            sequenceName: enrollment.sequence.name,
            result: result,
            success: true
          })
        } else {
          results.errors = 1
          results.details.push({
            enrollmentId,
            contactEmail: enrollment.contact.email,
            sequenceName: enrollment.sequence.name,
            error: result.reason,
            success: false
          })
        }
      } catch (error) {
        results.errors = 1
        results.details.push({
          enrollmentId,
          contactEmail: enrollment.contact.email,
          sequenceName: enrollment.sequence.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        })
      }

    } else if (sequenceId) {
      // Process all enrollments in a specific sequence
      console.log(`🎯 Processing all enrollments in sequence: ${sequenceId}`)
      
      const sequence = await prisma.sequence.findUnique({
        where: { id: sequenceId },
        include: {
          user: true,
          enrollments: {
            where: { status: 'ACTIVE' },
            include: { contact: true }
          }
        }
      })

      if (!sequence) {
        return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })
      }

      // Check ownership
      if (sequence.userId !== session.user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      console.log(`Found ${sequence.enrollments.length} active enrollments to process`)

      for (const enrollment of sequence.enrollments) {
        try {
          console.log(`\n📧 Processing enrollment ${enrollment.id} for ${enrollment.contact.email}`)
          const result = await sequenceService.processSequenceStep(enrollment.id)
          results.processed++
          
          if (result.success) {
            if (result.sentStep) results.sent++
            if (result.completed) results.completed++
            
            results.details.push({
              enrollmentId: enrollment.id,
              contactEmail: enrollment.contact.email,
              sequenceName: sequence.name,
              result: result,
              success: true
            })
          } else {
            results.errors++
            results.details.push({
              enrollmentId: enrollment.id,
              contactEmail: enrollment.contact.email,
              sequenceName: sequence.name,
              error: result.reason,
              success: false
            })
          }
        } catch (error) {
          results.errors++
          results.details.push({
            enrollmentId: enrollment.id,
            contactEmail: enrollment.contact.email,
            sequenceName: sequence.name,
            error: error instanceof Error ? error.message : 'Unknown error',
            success: false
          })
        }
      }

    } else {
      // Process all sequences owned by the user
      console.log(`🎯 Processing all active sequences for user`)
      
      const activeSequences = await prisma.sequence.findMany({
        where: {
          userId: session.user.id,
          status: 'ACTIVE',
          enrollments: {
            some: {
              status: 'ACTIVE'
            }
          }
        },
        include: {
          user: true,
          enrollments: {
            where: { status: 'ACTIVE' },
            include: { contact: true }
          }
        }
      })

      console.log(`Found ${activeSequences.length} active sequences to process`)

      for (const sequence of activeSequences) {
        console.log(`\n📚 Processing sequence: ${sequence.name} with ${sequence.enrollments.length} enrollments`)
        
        for (const enrollment of sequence.enrollments) {
          try {
            console.log(`\n📧 Processing enrollment ${enrollment.id} for ${enrollment.contact.email}`)
            const result = await sequenceService.processSequenceStep(enrollment.id)
            results.processed++
            
            if (result.success) {
              if (result.sentStep) results.sent++
              if (result.completed) results.completed++
              
              results.details.push({
                enrollmentId: enrollment.id,
                contactEmail: enrollment.contact.email,
                sequenceName: sequence.name,
                result: result,
                success: true
              })
            } else {
              results.errors++
              results.details.push({
                enrollmentId: enrollment.id,
                contactEmail: enrollment.contact.email,
                sequenceName: sequence.name,
                error: result.reason,
                success: false
              })
            }
          } catch (error) {
            results.errors++
            results.details.push({
              enrollmentId: enrollment.id,
              contactEmail: enrollment.contact.email,
              sequenceName: sequence.name,
              error: error instanceof Error ? error.message : 'Unknown error',
              success: false
            })
          }
        }
      }
    }

    console.log(`\n🎉 ==== MANUAL SEQUENCE PROCESSING COMPLETED ====`)
    console.log(`Processed: ${results.processed} enrollments`)
    console.log(`Sent: ${results.sent} emails`)
    console.log(`Completed: ${results.completed} sequences`)
    console.log(`Errors: ${results.errors}`)

    return NextResponse.json({
      success: true,
      ...results
    })

  } catch (error) {
    console.error('Manual sequence processing error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}