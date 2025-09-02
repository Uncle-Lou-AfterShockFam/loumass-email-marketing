import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
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

    // Get sample events with all relationships
    const sampleEvents = await prisma.emailEvent.findMany({
      where: { userId: user.id },
      take: 5,
      include: {
        contact: true,
        campaign: true,
        sequence: true
      }
    })

    // Check if we have contacts linked
    const eventsWithContacts = sampleEvents.filter(e => e.contactId !== null)
    const eventsWithSubjects = sampleEvents.filter(e => e.subject !== null)

    // Get sample contacts
    const contacts = await prisma.contact.findMany({
      where: { userId: user.id },
      take: 5
    })

    // Get sample campaigns
    const campaigns = await prisma.campaign.findMany({
      where: { userId: user.id },
      take: 5
    })

    return NextResponse.json({
      totalEvents: sampleEvents.length,
      eventsWithContacts: eventsWithContacts.length,
      eventsWithSubjects: eventsWithSubjects.length,
      totalContacts: contacts.length,
      totalCampaigns: campaigns.length,
      sampleEvent: sampleEvents[0] ? {
        id: sampleEvents[0].id,
        type: sampleEvents[0].type,
        eventType: sampleEvents[0].eventType,
        subject: sampleEvents[0].subject,
        contactId: sampleEvents[0].contactId,
        campaignId: sampleEvents[0].campaignId,
        contact: sampleEvents[0].contact,
        campaign: sampleEvents[0].campaign
      } : null,
      sampleContact: contacts[0],
      sampleCampaign: campaigns[0] ? {
        id: campaigns[0].id,
        name: campaigns[0].name,
        subject: campaigns[0].subject
      } : null
    })
  } catch (error) {
    console.error('Error in check endpoint:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}