import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { createContactWithStats } from '@/types/contact'

// Validation schema for updating contacts
const updateContactSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
  tags: z.array(z.string()).optional(),
  variables: z.record(z.string(), z.any()).optional(),
  unsubscribed: z.boolean().optional(),
  bounced: z.boolean().optional()
})

// GET /api/contacts/[id] - Get single contact
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contact = await prisma.contact.findFirst({
      where: { 
        id: id,
        userId: session.user.id // Ensure user owns this contact
      },
      include: {
        recipients: {
          include: {
            campaign: {
              select: {
                id: true,
                name: true,
                status: true
              }
            }
          }
        },
        sequenceEnrollments: {
          include: {
            sequence: {
              select: {
                id: true,
                name: true,
                status: true
              }
            }
          }
        }
      }
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Calculate engagement stats
    const emailEvents = await prisma.emailEvent.findMany({
      where: {
        contactId: id,
        userId: session.user.id
      }
    })

    const stats = {
      totalCampaigns: contact.recipients.filter(r => r.campaignId).length,
      totalSequences: contact.sequenceEnrollments.length,
      totalOpened: emailEvents.filter(e => e.type === 'OPENED').length,
      totalClicked: emailEvents.filter(e => e.type === 'CLICKED').length,
      totalReplied: emailEvents.filter(e => e.type === 'REPLIED').length,
      totalBounced: emailEvents.filter(e => e.type === 'BOUNCED').length,
      lastEngagement: emailEvents.length > 0 
        ? emailEvents.sort((a, b) => {
            const aTime = a.timestamp || a.createdAt
            const bTime = b.timestamp || b.createdAt
            return bTime.getTime() - aTime.getTime()
          })[0].timestamp || emailEvents[0].createdAt
        : null
    }

    const contactWithStats = createContactWithStats(
      {
        ...contact,
        variables: contact.variables as Record<string, any> | null
      },
      stats
    )

    return NextResponse.json({
      success: true,
      contact: contactWithStats
    })

  } catch (error) {
    console.error('Error fetching contact:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch contact' 
    }, { status: 500 })
  }
}

// PUT /api/contacts/[id] - Update contact
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request data
    const validationResult = updateContactSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid data', 
        details: validationResult.error.format() 
      }, { status: 400 })
    }

    const data = validationResult.data

    // Check if contact exists and user owns it
    const existingContact = await prisma.contact.findFirst({
      where: { 
        id: id,
        userId: session.user.id 
      }
    })

    if (!existingContact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Check if email is being changed and if it already exists
    if (data.email && data.email !== existingContact.email) {
      const emailExists = await prisma.contact.findFirst({
        where: {
          userId: session.user.id,
          email: data.email,
          id: { not: id }
        }
      })

      if (emailExists) {
        return NextResponse.json({ 
          error: 'Another contact with this email already exists' 
        }, { status: 409 })
      }
    }

    // Update contact
    const updatedContact = await prisma.contact.update({
      where: { id: id },
      data: {
        ...(data.email && { email: data.email }),
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.company !== undefined && { company: data.company }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.tags !== undefined && { tags: data.tags }),
        ...(data.variables !== undefined && { variables: data.variables }),
        ...(data.unsubscribed !== undefined && { unsubscribed: data.unsubscribed }),
        ...(data.bounced !== undefined && { bounced: data.bounced })
      }
    })

    return NextResponse.json({
      success: true,
      contact: updatedContact,
      message: 'Contact updated successfully'
    })

  } catch (error) {
    console.error('Error updating contact:', error)
    return NextResponse.json({ 
      error: 'Failed to update contact' 
    }, { status: 500 })
  }
}

// DELETE /api/contacts/[id] - Delete contact
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if contact exists and user owns it
    const contact = await prisma.contact.findFirst({
      where: { 
        id: id,
        userId: session.user.id 
      },
      include: {
        recipients: {
          where: {
            status: 'PENDING'
          }
        },
        sequenceEnrollments: {
          where: {
            status: 'ACTIVE'
          }
        }
      }
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Check if contact has active campaigns or sequences
    if (contact.recipients.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete contact with pending or active campaigns' 
      }, { status: 400 })
    }

    if (contact.sequenceEnrollments.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete contact with active sequence enrollments' 
      }, { status: 400 })
    }

    // Delete contact (cascading deletes will handle related records)
    await prisma.contact.delete({
      where: { id: id }
    })

    return NextResponse.json({
      success: true,
      message: 'Contact deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting contact:', error)
    return NextResponse.json({ 
      error: 'Failed to delete contact' 
    }, { status: 500 })
  }
}