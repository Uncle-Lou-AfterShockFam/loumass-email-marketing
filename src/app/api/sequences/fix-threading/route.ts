import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GmailFetchService } from '@/services/gmail-fetch-service'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`\n🔧 ==== FIXING THREADING FOR USER ${session.user.email} ====`)

    const gmailFetchService = new GmailFetchService()

    // Find enrollments missing thread IDs but have message IDs
    const enrollmentsToFix = await prisma.sequenceEnrollment.findMany({
      where: {
        sequence: {
          userId: session.user.id
        },
        gmailMessageId: {
          not: null
        },
        gmailThreadId: null // Missing thread ID
      },
      include: {
        sequence: {
          include: {
            user: {
              include: {
                gmailToken: true
              }
            }
          }
        },
        contact: true
      }
    })

    console.log(`Found ${enrollmentsToFix.length} enrollments that need thread ID fixes`)

    const results = {
      total: enrollmentsToFix.length,
      fixed: 0,
      errors: 0,
      details: [] as any[]
    }

    for (const enrollment of enrollmentsToFix) {
      try {
        if (!enrollment.sequence.user.gmailToken) {
          console.log(`Skipping enrollment ${enrollment.id} - no Gmail token`)
          continue
        }

        console.log(`\n🔍 Fixing enrollment ${enrollment.id}:`)
        console.log(`   - Contact: ${enrollment.contact.email}`)
        console.log(`   - Sequence: ${enrollment.sequence.name}`)
        console.log(`   - Gmail Message ID: ${enrollment.gmailMessageId}`)

        // Fetch message details from Gmail
        const messageDetails = await gmailFetchService.getMessageDetails(
          enrollment.sequence.userId,
          enrollment.sequence.user.gmailToken.email,
          enrollment.gmailMessageId!
        )

        if (messageDetails.threadId) {
          // Update enrollment with thread ID
          await prisma.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: {
              gmailThreadId: messageDetails.threadId,
              messageIdHeader: messageDetails.messageId || undefined
            }
          })

          console.log(`✅ Fixed enrollment ${enrollment.id} with thread ID: ${messageDetails.threadId}`)
          results.fixed++
          results.details.push({
            enrollmentId: enrollment.id,
            contactEmail: enrollment.contact.email,
            sequenceName: enrollment.sequence.name,
            gmailMessageId: enrollment.gmailMessageId,
            recoveredThreadId: messageDetails.threadId,
            recoveredMessageId: messageDetails.messageId,
            status: 'fixed'
          })
        } else {
          console.log(`⚠️ No thread ID found for enrollment ${enrollment.id}`)
          results.details.push({
            enrollmentId: enrollment.id,
            contactEmail: enrollment.contact.email,
            sequenceName: enrollment.sequence.name,
            gmailMessageId: enrollment.gmailMessageId,
            status: 'no_thread_id'
          })
        }

      } catch (error) {
        console.error(`❌ Error fixing enrollment ${enrollment.id}:`, error)
        results.errors++
        results.details.push({
          enrollmentId: enrollment.id,
          contactEmail: enrollment.contact?.email,
          sequenceName: enrollment.sequence?.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'error'
        })
      }
    }

    console.log(`\n📊 Threading fix complete:`)
    console.log(`   - Total: ${results.total}`)
    console.log(`   - Fixed: ${results.fixed}`)
    console.log(`   - Errors: ${results.errors}`)

    return NextResponse.json({
      success: true,
      message: `Fixed ${results.fixed} out of ${results.total} enrollments`,
      results
    })

  } catch (error) {
    console.error('Threading fix error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}