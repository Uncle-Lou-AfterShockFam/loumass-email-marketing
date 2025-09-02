import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

// 1x1 transparent pixel
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

// Helper function to decode tracking ID
function decodeTrackingId(trackingId: string): { campaignOrSequenceId: string; recipientId: string; timestamp: string; isSequence?: boolean; stepIndex?: number } | null {
  try {
    const decoded = Buffer.from(trackingId, 'base64url').toString()
    const parts = decoded.split(':')
    
    // Format for campaigns: campaignId:recipientId:timestamp
    // Format for sequences: seq:enrollmentId:stepIndex:timestamp
    if (parts[0] === 'seq') {
      return {
        campaignOrSequenceId: parts[1],
        recipientId: parts[1], // For sequences, this is enrollment ID
        timestamp: parts[3],
        isSequence: true,
        stepIndex: parseInt(parts[2])
      }
    }
    
    return {
      campaignOrSequenceId: parts[0],
      recipientId: parts[1],
      timestamp: parts[2]
    }
  } catch (error) {
    return null
  }
}

// Helper function to check if IP belongs to the sender
async function checkIfSenderIp(ip: string | undefined, userId: string): Promise<boolean> {
  if (!ip) return false
  
  // Get user's known IPs from their recent login sessions or stored preferences
  // For now, we'll check recent events from the same user
  const recentSenderEvents = await prisma.emailEvent.findFirst({
    where: {
      campaign: {
        userId: userId
      },
      eventData: {
        path: ['isSenderIp'],
        equals: true
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
  
  // Compare IP addresses (first 3 octets to handle dynamic IPs)
  if (recentSenderEvents?.ipAddress) {
    const storedOctets = recentSenderEvents.ipAddress.split('.').slice(0, 3).join('.')
    const currentOctets = ip.split('.').slice(0, 3).join('.')
    return storedOctets === currentOctets
  }
  
  // First time - we'll mark it as sender IP if they're testing their own campaign
  return false
}

// Helper function to check if IP is a Gmail proxy
function isGmailProxyIp(ip: string | undefined): boolean {
  if (!ip) return false
  
  // Gmail proxy IP ranges
  const gmailRanges = ['66.102', '66.249', '209.85', '172.217', '142.250', '142.251']
  const ipPrefix = ip.split('.').slice(0, 2).join('.')
  return gmailRanges.includes(ipPrefix)
}

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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ trackingId: string }> }
) {
  try {
    const { trackingId } = await context.params
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

    const { campaignOrSequenceId, recipientId, isSequence, stepIndex } = decoded
    console.log('Tracking type:', isSequence ? 'Sequence' : 'Campaign')
    console.log('Looking for recipient with ID:', campaignOrSequenceId, 'and contact/enrollment ID:', recipientId)

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
      // Check if this is the sender's IP or Gmail proxy
      const isSenderIp = await checkIfSenderIp(ip, recipient.campaign.userId)
      const isGmailProxy = isGmailProxyIp(ip)
      
      // Check if this is the first open event for this recipient
      const previousOpens = await prisma.emailEvent.count({
        where: {
          recipientId: recipient.id,
          eventType: 'OPENED'
        }
      })
      
      // First Gmail proxy open is pre-fetch, subsequent ones are real
      const isPreFetch = isGmailProxy && previousOpens === 0
      const isRealUserOpen = !isPreFetch && (!isSenderIp || recipient.campaign.status === 'SENT')
      
      // Get location data from IP
      const location = ip ? await getLocationFromIp(ip) : null
      
      // Always track the event for visibility, but mark the type
      await prisma.emailEvent.create({
        data: {
          campaignId: recipient.campaignId,
          recipientId: recipient.id,
          eventType: 'OPENED',
          eventData: {
            userAgent,
            ipAddress: ip,
            timestamp: new Date().toISOString(),
            isSenderIp, // Mark if this is from the sender
            isGmailProxy, // Mark if this is Gmail proxy
            isPreFetch, // Mark if this is the initial pre-fetch
            openNumber: previousOpens + 1, // Track which open this is
            location: location || undefined // Add location data if available
          },
          ipAddress: ip,
          userAgent
        }
      })

      // Update recipient status and campaign stats for real opens
      if (isRealUserOpen) {
        // Update recipient open status only for real opens
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

        // Update campaign stats only for first real open
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
      }
    } else if (decoded.isSequence) {
      // Handle sequence tracking
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
        // Check if this is the sender's IP or Gmail proxy
        const isSenderIp = await checkIfSenderIp(ip, enrollment.sequence.userId)
        const isGmailProxy = isGmailProxyIp(ip)
        
        // Check if this is the first open event for this step
        const previousOpens = await prisma.sequenceEvent.count({
          where: {
            enrollmentId: enrollment.id,
            stepIndex: stepIndex || 0,
            eventType: 'OPENED'
          }
        })
        
        // First Gmail proxy open is pre-fetch, subsequent ones are real
        const isPreFetch = isGmailProxy && previousOpens === 0
        const isRealUserOpen = !isPreFetch && (!isSenderIp || enrollment.sequence.status === 'ACTIVE')
        
        // Get location data from IP
        const location = ip ? await getLocationFromIp(ip) : null
        
        // Always track the event for visibility
        await prisma.sequenceEvent.create({
          data: {
            enrollmentId: enrollment.id,
            stepIndex: stepIndex || 0,
            eventType: 'OPENED',
            eventData: {
              userAgent,
              ipAddress: ip,
              timestamp: new Date().toISOString(),
              isSenderIp,
              isGmailProxy,
              isPreFetch,
              openNumber: previousOpens + 1,
              location: location || undefined
            },
            ipAddress: ip,
            userAgent
          }
        })

        // Update enrollment stats for real opens
        if (isRealUserOpen) {
          const updateData: any = {
            openCount: { increment: 1 }
          }
          
          if (!enrollment.lastOpenedAt) {
            updateData.lastOpenedAt = new Date()
          }

          await prisma.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: updateData
          })
        }
      }
    }

    // Return the tracking pixel with aggressive no-cache headers
    return new NextResponse(PIXEL, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        'X-Accel-Expires': '0'
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