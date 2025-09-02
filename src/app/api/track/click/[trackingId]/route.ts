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
function decodeTrackingId(trackingId: string): { 
  campaignOrSequenceId: string; 
  recipientId: string; 
  linkIndex?: number;
  timestamp: string; 
  isSequence?: boolean; 
  stepIndex?: number 
} | null {
  try {
    const decoded = Buffer.from(trackingId, 'base64url').toString()
    const parts = decoded.split(':')
    
    // Format for campaigns: campaignId:recipientId:linkIndex:timestamp
    // Format for sequences: seq:enrollmentId:stepIndex:linkIndex:timestamp
    if (parts[0] === 'seq') {
      return {
        campaignOrSequenceId: parts[1],
        recipientId: parts[1], // For sequences, this is enrollment ID
        stepIndex: parseInt(parts[2]),
        linkIndex: parts[3] ? parseInt(parts[3]) : undefined,
        timestamp: parts[4] || parts[3],
        isSequence: true
      }
    }
    
    return {
      campaignOrSequenceId: parts[0],
      recipientId: parts[1],
      linkIndex: parts[2] ? parseInt(parts[2]) : undefined,
      timestamp: parts[3] || parts[2]
    }
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

    const { campaignOrSequenceId, recipientId, linkIndex, isSequence, stepIndex } = decoded
    console.log('Tracking type:', isSequence ? 'Sequence' : 'Campaign')
    console.log('Looking for recipient with ID:', campaignOrSequenceId, 'and contact/enrollment ID:', recipientId)

    // Handle campaign click tracking
    if (!isSequence) {
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
            linkIndex,
            userAgent,
            ipAddress: ip,
            timestamp: new Date().toISOString(),
            location: location || undefined
          },
          ipAddress: ip,
          userAgent
        }
      })

      // Update recipient click status and campaign stats  
      if (!recipient.clickedAt) {
        // Update recipient with first click timestamp
        // Also mark as opened if not already (clicks imply opens)
        const updateData: any = {
          clickedAt: new Date(),
          status: 'CLICKED' as const
        }
        
        // If not opened yet, mark as opened too
        if (!recipient.openedAt) {
          updateData.openedAt = new Date()
        }
        
        await prisma.recipient.update({
          where: { id: recipient.id },
          data: updateData
        })
        
        // Update campaign stats
        const campaignUpdateData: any = {
          clickCount: {
            increment: 1
          }
        }
        
        // If this is also the first open, increment open count
        if (!recipient.openedAt) {
          campaignUpdateData.openCount = {
            increment: 1
          }
        }
        
        await prisma.campaign.update({
          where: { id: recipient.campaignId },
          data: campaignUpdateData
        })
      }
    }
    } else {
      // Handle sequence click tracking
      const enrollment = await prisma.sequenceEnrollment.findUnique({
        where: { id: recipientId },
        include: {
          contact: true,
          sequence: {
            include: {
              user: true
            }
          }
        }
      })

      console.log('Found sequence enrollment:', enrollment ? `ID: ${enrollment.id}, Step: ${stepIndex}` : 'Not found')

      if (enrollment) {
        // Get location data from IP
        const location = ip ? await getLocationFromIp(ip) : null
        
        // Track the click event
        await prisma.sequenceEvent.create({
          data: {
            enrollmentId: enrollment.id,
            stepIndex: stepIndex || 0,
            eventType: 'CLICKED',
            eventData: {
              url,
              linkIndex,
              userAgent,
              ipAddress: ip,
              timestamp: new Date().toISOString(),
              location: location || undefined
            },
            ipAddress: ip,
            userAgent
          }
        })

        // Update enrollment click stats
        const updateData: any = {
          clickCount: { increment: 1 }
        }
        
        if (!enrollment.lastClickedAt) {
          updateData.lastClickedAt = new Date()
        }

        // Also update open stats if not already opened
        if (!enrollment.lastOpenedAt) {
          updateData.lastOpenedAt = new Date()
          updateData.openCount = { increment: 1 }
        }

        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: updateData
        })
      }
    }

    // Decode the URL and ensure it's a valid absolute URL
    const decodedUrl = decodeURIComponent(url)
    console.log('Redirecting to:', decodedUrl)
    
    // Ensure the URL is absolute
    let redirectUrl: URL
    try {
      redirectUrl = new URL(decodedUrl)
    } catch (e) {
      // If not a valid URL, try adding https://
      try {
        redirectUrl = new URL(`https://${decodedUrl}`)
      } catch (e2) {
        console.error('Invalid redirect URL:', decodedUrl)
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
    
    // Redirect to the actual URL
    return NextResponse.redirect(redirectUrl.toString())
  } catch (error) {
    console.error('Click tracking error:', error)
    // Redirect to the original URL on error
    const url = request.nextUrl.searchParams.get('u')
    if (url) {
      try {
        const decodedUrl = decodeURIComponent(url)
        const redirectUrl = new URL(decodedUrl)
        return NextResponse.redirect(redirectUrl.toString())
      } catch (e) {
        // Try with https:// prefix
        try {
          const redirectUrl = new URL(`https://${decodeURIComponent(url)}`)
          return NextResponse.redirect(redirectUrl.toString())
        } catch (e2) {
          // Fall back to home page
        }
      }
    }
    return NextResponse.redirect(new URL('/', request.url))
  }
}