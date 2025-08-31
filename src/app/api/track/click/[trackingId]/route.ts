import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

// Helper to get location from IP
async function getLocationFromIp(ip: string): Promise<{ city?: string; region?: string; country?: string } | null> {
  if (!ip) return null
  
  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    if (response.ok) {
      const data = await response.json()
      return {
        city: data.city,
        region: data.region,
        country: data.country_name
      }
    }
  } catch (error) {
    console.log('Failed to get location for IP:', ip, error)
  }
  return null
}

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
    const url = request.nextUrl.searchParams.get('u')
    
    console.log('=== TRACKING CLICK REQUEST ===')
    console.log('Tracking ID:', trackingId)
    console.log('Target URL:', url)
    
    if (!url) {
      console.log('No URL provided, redirecting to home')
      return NextResponse.redirect(new URL('/', request.url))
    }

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
      return NextResponse.redirect(url)
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
      // Update recipient click status
      const updateData: any = {}
      
      if (!recipient.clickedAt) {
        updateData.clickedAt = new Date()
        updateData.status = 'CLICKED' as const
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.recipient.update({
          where: { id: recipient.id },
          data: updateData
        })
      }

      // Get location data from IP
      const location = ip ? await getLocationFromIp(ip) : null

      // Create tracking event
      await prisma.emailEvent.create({
        data: {
          campaignId: recipient.campaignId,
          recipientId: recipient.id,
          eventType: 'CLICKED',
          eventData: {
            url,
            userAgent,
            ipAddress: ip,
            timestamp: new Date().toISOString(),
            location: location || undefined // Add location data if available
          },
          ipAddress: ip,
          userAgent
        }
      })

      // Update recipient click status and campaign stats
      if (!recipient.clickedAt) {
        // Update recipient with first click timestamp
        await prisma.recipient.update({
          where: { id: recipient.id },
          data: {
            clickedAt: new Date(),
            status: 'CLICKED' as const
          }
        })
        
        // Update campaign stats
        await prisma.campaign.update({
          where: { id: recipient.campaignId },
          data: {
            clickCount: {
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

    // Redirect to the actual URL
    return NextResponse.redirect(decodeURIComponent(url))
  } catch (error) {
    console.error('Click tracking error:', error)
    // Redirect to the original URL on error
    const url = request.nextUrl.searchParams.get('u')
    if (url) {
      return NextResponse.redirect(decodeURIComponent(url))
    }
    return NextResponse.redirect(new URL('/', request.url))
  }
}