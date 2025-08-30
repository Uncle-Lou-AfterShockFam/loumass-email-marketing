import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

// 1x1 transparent pixel
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

// Helper function to decode tracking ID
function decodeTrackingId(trackingId: string): { campaignOrSequenceId: string; recipientId: string; timestamp: string } | null {
  try {
    const decoded = Buffer.from(trackingId, 'base64url').toString()
    const [campaignOrSequenceId, recipientId, timestamp] = decoded.split(':')
    return { campaignOrSequenceId, recipientId, timestamp }
  } catch (error) {
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  try {
    const { trackingId } = await params
    console.log('=== TRACKING OPEN REQUEST ===')
    console.log('Tracking ID:', trackingId)
    
    const headersList = await headers()
    const userAgent = headersList.get('user-agent') || undefined
    const ip = headersList.get('x-forwarded-for') || 
               headersList.get('x-real-ip') || 
               undefined

    // Decode the tracking ID
    const decoded = decodeTrackingId(trackingId)
    console.log('Decoded tracking data:', decoded)
    
    if (!decoded) {
      console.error('Failed to decode tracking ID:', trackingId)
      return new NextResponse(PIXEL, {
        status: 200,
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store'
        }
      })
    }

    const { campaignOrSequenceId, recipientId } = decoded
    console.log('Looking for recipient with campaignId:', campaignOrSequenceId, 'and contactId:', recipientId)

    // Try to find a campaign recipient first
    let recipient = await prisma.recipient.findFirst({
      where: {
        campaignId: campaignOrSequenceId,
        contactId: recipientId
      },
      include: {
        contact: true,
        campaign: {
          include: {
            user: true
          }
        }
      }
    })

    console.log('Found recipient:', recipient ? `ID: ${recipient.id}, Status: ${recipient.status}` : 'Not found')

    if (recipient) {
      // Update recipient open status
      const updateData: any = {}
      
      if (!recipient.openedAt) {
        updateData.openedAt = new Date()
        updateData.status = 'OPENED' as const
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.recipient.update({
          where: { id: recipient.id },
          data: updateData
        })
      }

      // Create tracking event
      await prisma.emailEvent.create({
        data: {
          campaignId: recipient.campaignId,
          recipientId: recipient.id,
          eventType: 'OPENED',
          eventData: {
            userAgent,
            ipAddress: ip,
            timestamp: new Date().toISOString()
          },
          ipAddress: ip,
          userAgent
        }
      })

      // Update campaign stats if this is the first open
      if (!recipient.openedAt) {
        await prisma.campaign.update({
          where: { id: recipient.campaignId },
          data: {
            openCount: {
              increment: 1
            }
          }
        })
      }
    } else {
      // TODO: Sequence step tracking not implemented - sequenceStep model doesn't exist
      // For now, just create a basic email event without sequence step tracking
      const sequenceStep = null

      // Sequence step tracking will be implemented when sequenceStep model is added
      // For now, this else block does nothing since sequenceStep is null
    }

    // Return the tracking pixel
    return new NextResponse(PIXEL, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Tracking error:', error)
    // Still return the pixel even on error
    return new NextResponse(PIXEL, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store'
      }
    })
  }
}