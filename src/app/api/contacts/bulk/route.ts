import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for bulk contact operations
const bulkContactSchema = z.object({
  action: z.enum(['delete', 'add_tags', 'remove_tags', 'update_status', 'export', 'import']),
  contactIds: z.array(z.string()).optional(),
  options: z.object({
    tags: z.array(z.string()).optional(),
    unsubscribed: z.boolean().optional(),
    bounced: z.boolean().optional(),
    csvData: z.string().optional(), // For import
    format: z.enum(['csv', 'json']).optional() // For export
  }).optional()
})

// POST /api/contacts/bulk - Bulk operations on contacts
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request data
    const validationResult = bulkContactSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid data', 
        details: validationResult.error.format() 
      }, { status: 400 })
    }

    const { action, contactIds, options } = validationResult.data

    // For most actions, verify contacts belong to the user
    let contacts = []
    if (contactIds && contactIds.length > 0) {
      contacts = await prisma.contact.findMany({
        where: {
          id: { in: contactIds },
          userId: session.user.id
        }
      })

      if (contacts.length !== contactIds.length) {
        return NextResponse.json({ 
          error: 'Some contacts not found or not owned by user' 
        }, { status: 404 })
      }
    }

    let results = []

    switch (action) {
      case 'delete':
        if (!contactIds || contactIds.length === 0) {
          return NextResponse.json({ 
            error: 'Contact IDs required for delete action' 
          }, { status: 400 })
        }

        // Check if any contacts are in active campaigns
        const activeRecipients = await prisma.recipient.findMany({
          where: {
            contactId: { in: contactIds },
            campaign: {
              status: { in: ['SENDING', 'SCHEDULED'] }
            }
          },
          include: {
            campaign: {
              select: { name: true }
            }
          }
        })

        if (activeRecipients.length > 0) {
          const campaignNames = [...new Set(activeRecipients.map(r => r.campaign?.name))].join(', ')
          return NextResponse.json({
            error: `Cannot delete contacts that are in active campaigns: ${campaignNames}`
          }, { status: 400 })
        }

        await prisma.contact.deleteMany({
          where: {
            id: { in: contactIds },
            userId: session.user.id
          }
        })

        results = contactIds.map(id => ({
          id,
          action: 'deleted',
          success: true
        }))
        break

      case 'add_tags':
        if (!contactIds || !options?.tags) {
          return NextResponse.json({ 
            error: 'Contact IDs and tags required for add_tags action' 
          }, { status: 400 })
        }

        for (const contact of contacts) {
          const existingTags = Array.isArray(contact.tags) ? contact.tags as string[] : []
          const newTags = [...new Set([...existingTags, ...options.tags])]
          
          await prisma.contact.update({
            where: { id: contact.id },
            data: { tags: newTags }
          })
        }

        results = contactIds.map(id => ({
          id,
          action: 'tags_added',
          success: true,
          tags: options.tags
        }))
        break

      case 'remove_tags':
        if (!contactIds || !options?.tags) {
          return NextResponse.json({ 
            error: 'Contact IDs and tags required for remove_tags action' 
          }, { status: 400 })
        }

        for (const contact of contacts) {
          const existingTags = Array.isArray(contact.tags) ? contact.tags as string[] : []
          const newTags = existingTags.filter(tag => !options.tags!.includes(tag))
          
          await prisma.contact.update({
            where: { id: contact.id },
            data: { tags: newTags }
          })
        }

        results = contactIds.map(id => ({
          id,
          action: 'tags_removed',
          success: true,
          tags: options.tags
        }))
        break

      case 'update_status':
        if (!contactIds) {
          return NextResponse.json({ 
            error: 'Contact IDs required for update_status action' 
          }, { status: 400 })
        }

        const updateData: any = {}
        if (options?.unsubscribed !== undefined) {
          updateData.unsubscribed = options.unsubscribed
        }
        if (options?.bounced !== undefined) {
          updateData.bounced = options.bounced
        }

        if (Object.keys(updateData).length === 0) {
          return NextResponse.json({ 
            error: 'At least one status field (unsubscribed, bounced) required' 
          }, { status: 400 })
        }

        await prisma.contact.updateMany({
          where: {
            id: { in: contactIds },
            userId: session.user.id
          },
          data: updateData
        })

        results = contactIds.map(id => ({
          id,
          action: 'status_updated',
          success: true,
          updates: updateData
        }))
        break

      case 'export':
        // Export contacts to CSV or JSON
        const allContacts = contactIds && contactIds.length > 0
          ? contacts
          : await prisma.contact.findMany({
              where: { userId: session.user.id },
              orderBy: { createdAt: 'desc' }
            })

        if (options?.format === 'json') {
          return NextResponse.json({
            success: true,
            action: 'export',
            format: 'json',
            data: allContacts,
            count: allContacts.length
          })
        } else {
          // CSV format
          const csvHeaders = 'email,firstName,lastName,company,phone,tags,unsubscribed,bounced,createdAt'
          const csvRows = allContacts.map(contact => 
            [
              contact.email,
              contact.firstName || '',
              contact.lastName || '',
              contact.company || '',
              contact.phone || '',
              Array.isArray(contact.tags) ? (contact.tags as string[]).join(';') : '',
              contact.unsubscribed ? 'true' : 'false',
              contact.bounced ? 'true' : 'false',
              contact.createdAt.toISOString()
            ].map(field => `"${field.toString().replace(/"/g, '""')}"`).join(',')
          )
          
          const csvContent = [csvHeaders, ...csvRows].join('\n')
          
          return new Response(csvContent, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': 'attachment; filename="contacts.csv"'
            }
          })
        }

      case 'import':
        if (!options?.csvData) {
          return NextResponse.json({ 
            error: 'CSV data required for import action' 
          }, { status: 400 })
        }

        // Parse CSV data
        const lines = options.csvData.trim().split('\n')
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
        
        const requiredFields = ['email']
        const missingFields = requiredFields.filter(field => !headers.includes(field))
        
        if (missingFields.length > 0) {
          return NextResponse.json({
            error: `Missing required fields: ${missingFields.join(', ')}`
          }, { status: 400 })
        }

        const importResults = []
        const errors = []

        for (let i = 1; i < lines.length; i++) {
          try {
            const values = lines[i].split(',').map(v => v.trim().replace(/^"(.*)"$/, '$1'))
            const contactData: any = {}

            headers.forEach((header, index) => {
              const value = values[index] || ''
              switch (header) {
                case 'email':
                  contactData.email = value
                  break
                case 'firstname':
                case 'first_name':
                  contactData.firstName = value
                  break
                case 'lastname':
                case 'last_name':
                  contactData.lastName = value
                  break
                case 'company':
                  contactData.company = value
                  break
                case 'phone':
                  contactData.phone = value
                  break
                case 'tags':
                  contactData.tags = value ? value.split(';').map(t => t.trim()) : []
                  break
              }
            })

            // Check if contact already exists
            const existingContact = await prisma.contact.findFirst({
              where: {
                userId: session.user.id,
                email: contactData.email
              }
            })

            if (existingContact) {
              errors.push(`Row ${i + 1}: Contact with email ${contactData.email} already exists`)
              continue
            }

            // Create new contact
            const newContact = await prisma.contact.create({
              data: {
                userId: session.user.id,
                email: contactData.email,
                firstName: contactData.firstName,
                lastName: contactData.lastName,
                company: contactData.company,
                phone: contactData.phone,
                tags: contactData.tags || [],
                variables: {},
                unsubscribed: false,
                bounced: false
              }
            })

            importResults.push({
              row: i + 1,
              email: contactData.email,
              contactId: newContact.id,
              success: true
            })

          } catch (error) {
            errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }

        results = {
          action: 'import',
          imported: importResults,
          errors,
          summary: {
            totalRows: lines.length - 1,
            successful: importResults.length,
            failed: errors.length
          }
        }
        break

      default:
        return NextResponse.json({ 
          error: `Unsupported action: ${action}` 
        }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      action,
      results
    })

  } catch (error) {
    console.error('Error performing bulk contact operation:', error)
    return NextResponse.json({ 
      error: 'Failed to perform bulk operation' 
    }, { status: 500 })
  }
}