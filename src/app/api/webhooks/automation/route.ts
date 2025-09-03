import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { automationTrigger } from '@/services/automationTrigger'
import { z } from 'zod'

// Enhanced webhook payload schema supporting multiple operations
const webhookPayloadSchema = z.object({
  operation: z.enum(['add_subscriber', 'delete_subscriber', 'unsubscribe', 'send_sms', 'send_email', 'trigger_automation']).optional(),
  userId: z.string().optional(),
  contactId: z.string().optional(),
  contact_id: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.string(), z.any()).optional(),
  automationId: z.string().optional(),
  webhook_id: z.string().optional(),
  webhookId: z.string().optional(),
  timestamp: z.string().optional(),
  source: z.string().optional(),
  // Allow any additional fields for flexibility
}).catchall(z.any())

// POST /api/webhooks/automation - Handle incoming automation webhooks
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Incoming webhook payload:', JSON.stringify(body, null, 2))

    // Validate webhook payload
    const validationResult = webhookPayloadSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid webhook payload', 
        details: validationResult.error.issues 
      }, { status: 400 })
    }

    const payload = validationResult.data

    // Extract webhook ID from payload or URL parameters
    const webhookId = payload.webhookId || payload.webhook_id
    
    if (!webhookId) {
      return NextResponse.json({ 
        error: 'Missing webhook ID in payload' 
      }, { status: 400 })
    }

    // Find webhook configuration to get userId
    const webhook = await prisma.automation.findFirst({
      where: {
        triggerEvent: 'WEBHOOK',
        triggerData: {
          path: ['webhookId'],
          equals: webhookId
        },
        status: 'ACTIVE'
      }
    })

    if (!webhook) {
      return NextResponse.json({ 
        error: 'Webhook not found or not active',
        webhookId 
      }, { status: 404 })
    }

    // Handle different operations
    const operation = payload.operation || 'trigger_automation'
    let contactId = payload.contactId || payload.contact_id
    let responseData: any = { success: true, operation }

    switch (operation) {
      case 'add_subscriber':
        if (!payload.email) {
          return NextResponse.json({ 
            error: 'Email required for add_subscriber operation' 
          }, { status: 400 })
        }

        // Create or update contact
        const contact = await prisma.contact.upsert({
          where: {
            userId_email: {
              userId: webhook.userId,
              email: payload.email
            }
          },
          update: {
            firstName: payload.firstName || undefined,
            lastName: payload.lastName || undefined,
            phone: payload.phone || undefined,
            tags: payload.tags || undefined,
            customFields: payload.customFields || undefined,
            updatedAt: new Date()
          },
          create: {
            userId: webhook.userId,
            email: payload.email,
            firstName: payload.firstName || null,
            lastName: payload.lastName || null,
            phone: payload.phone || null,
            tags: payload.tags || [],
            customFields: payload.customFields || {},
            status: 'ACTIVE'
          }
        })

        contactId = contact.id
        responseData.contactId = contactId
        responseData.email = contact.email
        break

      case 'delete_subscriber':
        if (!contactId && !payload.email) {
          return NextResponse.json({ 
            error: 'Contact ID or email required for delete_subscriber operation' 
          }, { status: 400 })
        }

        const deleteWhere = contactId 
          ? { id: contactId, userId: webhook.userId }
          : { userId_email: { userId: webhook.userId, email: payload.email! } }

        await prisma.contact.delete({
          where: deleteWhere
        })

        responseData.message = 'Subscriber deleted successfully'
        break

      case 'unsubscribe':
        if (!contactId && !payload.email) {
          return NextResponse.json({ 
            error: 'Contact ID or email required for unsubscribe operation' 
          }, { status: 400 })
        }

        const updateWhere = contactId 
          ? { id: contactId, userId: webhook.userId }
          : { userId_email: { userId: webhook.userId, email: payload.email! } }

        const unsubscribedContact = await prisma.contact.update({
          where: updateWhere,
          data: {
            status: 'UNSUBSCRIBED',
            unsubscribedAt: new Date(),
            updatedAt: new Date()
          }
        })

        responseData.contactId = unsubscribedContact.id
        responseData.message = 'Contact unsubscribed successfully'
        break

      case 'trigger_automation':
        if (!contactId) {
          return NextResponse.json({ 
            error: 'Contact ID required for trigger_automation operation' 
          }, { status: 400 })
        }

        // Trigger the automation
        await automationTrigger.triggerWebhook(webhook.userId, webhookId, payload)
        responseData.automationId = webhook.id
        responseData.contactId = contactId
        responseData.message = 'Automation triggered successfully'
        break

      default:
        // For any other operation, just trigger the webhook
        if (contactId) {
          await automationTrigger.triggerWebhook(webhook.userId, webhookId, payload)
          responseData.message = 'Webhook processed successfully'
        } else {
          responseData.message = 'Webhook received but no contact ID provided'
        }
    }

    // Log the webhook event
    console.log(`Webhook ${webhookId} processed successfully:`, responseData)

    return NextResponse.json({
      ...responseData,
      webhookId,
      timestamp: new Date().toISOString(),
      source: payload.source || 'external'
    })

  } catch (error) {
    console.error('Webhook processing error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid webhook payload format',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({ 
      error: 'Failed to process webhook',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET /api/webhooks/automation - Webhook endpoint info (for testing)
export async function GET() {
  return NextResponse.json({
    message: 'Automation webhook endpoint',
    supportedOperations: [
      'add_subscriber',
      'delete_subscriber', 
      'unsubscribe',
      'send_sms',
      'send_email',
      'trigger_automation'
    ],
    requiredFields: {
      add_subscriber: ['email', 'webhookId'],
      delete_subscriber: ['contactId or email', 'webhookId'],
      unsubscribe: ['contactId or email', 'webhookId'],
      trigger_automation: ['contactId', 'webhookId']
    },
    examplePayload: {
      operation: 'add_subscriber',
      webhookId: 'webhook-uuid',
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      tags: ['lead', 'webinar'],
      customFields: {
        company: 'Acme Corp',
        source: 'website'
      }
    }
  })
}