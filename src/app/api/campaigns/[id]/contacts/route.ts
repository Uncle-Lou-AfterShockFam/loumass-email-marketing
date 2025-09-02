import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/campaigns/[id]/contacts - Get campaign contacts
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await context.params
    
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check campaign exists and belongs to user
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        userId: session.user.id
      },
      select: {
        id: true,
        name: true,
        status: true
      }
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Get campaign recipients with contact details
    const recipients = await prisma.recipient.findMany({
      where: {
        campaignId
      },
      include: {
        contact: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            tags: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status
      },
      recipients: recipients.map(recipient => ({
        id: recipient.id,
        contact: {
          ...recipient.contact,
          displayName: `${recipient.contact.firstName || ''} ${recipient.contact.lastName || ''}`.trim() || recipient.contact.email
        },
        status: recipient.status,
        createdAt: recipient.createdAt
      })),
      summary: {
        totalRecipients: recipients.length,
        contactsCount: recipients.length
      }
    })

  } catch (error) {
    console.error('Error fetching campaign contacts:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch campaign contacts' 
    }, { status: 500 })
  }
}