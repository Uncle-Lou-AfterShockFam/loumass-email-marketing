import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { createContactWithStats } from '@/types/contact'

const createContactSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  variables: z.record(z.string()).optional().default({})
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = createContactSchema.parse(body)

    // Check if contact already exists for this user
    const existingContact = await prisma.contact.findFirst({
      where: {
        userId: session.user.id,
        email: validatedData.email
      }
    })

    if (existingContact) {
      return NextResponse.json(
        { error: 'Contact with this email already exists' },
        { status: 409 }
      )
    }

    // Create the contact
    const contact = await prisma.contact.create({
      data: {
        userId: session.user.id,
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        company: validatedData.company,
        phone: validatedData.phone,
        tags: validatedData.tags,
        variables: validatedData.variables,
        unsubscribed: false,
        bounced: false
      }
    })

    return NextResponse.json({
      success: true,
      contact: {
        id: contact.id,
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
        company: contact.company,
        phone: contact.phone,
        tags: contact.tags,
        variables: contact.variables,
        createdAt: contact.createdAt
      }
    })

  } catch (error) {
    console.error('Error creating contact:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const rawContacts = await prisma.contact.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform contacts to include computed fields
    const contacts = rawContacts.map(contact => 
      createContactWithStats(contact, {
        totalCampaigns: 0, // TODO: Calculate from campaign relationships
        totalOpened: 0, // TODO: Calculate from email events
        totalClicked: 0, // TODO: Calculate from email events
        totalReplied: 0, // TODO: Calculate from email events
        lastEngagement: null // TODO: Calculate from email events
      })
    )

    // Calculate stats
    const totalContacts = contacts.length
    const subscribedContacts = contacts.filter(c => !c.unsubscribed).length
    const unsubscribedContacts = contacts.filter(c => c.unsubscribed).length
    const bouncedContacts = contacts.filter(c => c.bounced).length
    const recentlyAdded = contacts.filter(c => 
      new Date(c.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
    ).length

    // Extract unique tags
    const allTags = contacts.flatMap(c => c.tags as string[])
    const tagCounts = allTags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const tags = Object.entries(tagCounts).map(([name, count]) => ({
      id: name,
      name,
      count
    }))

    const stats = {
      totalContacts,
      subscribedContacts,
      unsubscribedContacts,
      bouncedContacts,
      subscribedRate: totalContacts > 0 ? Math.round((subscribedContacts / totalContacts) * 100) : 0,
      recentlyAdded,
      engagedContacts: 0, // TODO: Calculate from email events
      engagementRate: 0 // TODO: Calculate from email events
    }

    return NextResponse.json({
      success: true,
      contacts,
      stats,
      tags
    })

  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    )
  }
}