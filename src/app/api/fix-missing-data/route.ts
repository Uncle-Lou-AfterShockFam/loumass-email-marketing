import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Step 1: Fix missing subjects in EmailEvents from campaigns
    const campaignsWithSubjects = await prisma.campaign.findMany({
      where: { 
        userId: user.id,
        subject: { not: '' }
      },
      select: {
        id: true,
        subject: true
      }
    })

    let subjectsUpdated = 0
    for (const campaign of campaignsWithSubjects) {
      const result = await prisma.emailEvent.updateMany({
        where: {
          userId: user.id,
          campaignId: campaign.id,
          subject: null
        },
        data: {
          subject: campaign.subject
        }
      })
      subjectsUpdated += result.count
    }

    // Step 2: Fix missing contactId in EmailEvents
    // First, get all recipients with their contact relationships
    const recipients = await prisma.recipient.findMany({
      where: {
        campaign: {
          userId: user.id
        }
      },
      select: {
        id: true,
        campaignId: true,
        contactId: true
      }
    })

    // Create a map of campaignId -> contactId for quick lookup
    const campaignContactMap = new Map<string, Set<string>>()
    recipients.forEach(recipient => {
      if (!campaignContactMap.has(recipient.campaignId)) {
        campaignContactMap.set(recipient.campaignId, new Set())
      }
      campaignContactMap.get(recipient.campaignId)!.add(recipient.contactId)
    })

    // Update EmailEvents with missing contactId based on campaign
    let contactsLinked = 0
    for (const [campaignId, contactIds] of campaignContactMap) {
      // For now, link to the first contact if there are multiple
      // In a real scenario, we'd need more logic to determine the correct contact
      const contactId = Array.from(contactIds)[0]
      
      const result = await prisma.emailEvent.updateMany({
        where: {
          userId: user.id,
          campaignId: campaignId,
          contactId: null
        },
        data: {
          contactId: contactId
        }
      })
      contactsLinked += result.count
    }

    // Step 3: Ensure all EmailEvents have a type (default to SENT if missing)
    const typesFixed = await prisma.emailEvent.updateMany({
      where: {
        userId: user.id,
        type: null,
        eventType: null
      },
      data: {
        type: 'SENT'
      }
    })

    // Get summary statistics
    const totalEvents = await prisma.emailEvent.count({
      where: { userId: user.id }
    })

    const eventsWithContacts = await prisma.emailEvent.count({
      where: { 
        userId: user.id,
        contactId: { not: null }
      }
    })

    const eventsWithSubjects = await prisma.emailEvent.count({
      where: { 
        userId: user.id,
        subject: { not: null }
      }
    })

    const eventsWithTypes = await prisma.emailEvent.count({
      where: { 
        userId: user.id,
        OR: [
          { type: { not: null } },
          { eventType: { not: null } }
        ]
      }
    })

    return NextResponse.json({
      success: true,
      fixes: {
        subjectsUpdated,
        contactsLinked,
        typesFixed: typesFixed.count
      },
      summary: {
        totalEvents,
        eventsWithContacts,
        eventsWithSubjects,
        eventsWithTypes
      }
    })

  } catch (error) {
    console.error('Error fixing missing data:', error)
    return NextResponse.json({ 
      error: 'Failed to fix missing data',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}