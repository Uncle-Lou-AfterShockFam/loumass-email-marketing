import { prisma } from '@/lib/prisma'
import { GmailService } from './gmail-service'
import { CampaignStatus } from '@prisma/client'

interface CampaignData {
  name: string
  subject: string
  content: string
  scheduledFor?: Date
  trackingEnabled?: boolean
}

export class CampaignService {
  private gmailService = new GmailService()

  async createCampaign(userId: string, data: CampaignData) {
    return await prisma.campaign.create({
      data: {
        userId,
        name: data.name,
        subject: data.subject,
        content: data.content,
        scheduledFor: data.scheduledFor,
        trackingEnabled: data.trackingEnabled ?? true,
        status: data.scheduledFor ? CampaignStatus.SCHEDULED : CampaignStatus.DRAFT
      }
    })
  }

  async updateCampaign(id: string, userId: string, data: Partial<CampaignData>) {
    return await prisma.campaign.update({
      where: { id, userId },
      data
    })
  }

  async sendCampaign(campaignId: string, userId: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, userId },
      include: {
        recipients: {
          include: {
            contact: true
          }
        }
      }
    })

    if (!campaign) {
      throw new Error('Campaign not found')
    }

    if (campaign.status === CampaignStatus.SENT) {
      throw new Error('Campaign already sent')
    }

    // Get Gmail token
    const gmailToken = await prisma.gmailToken.findUnique({
      where: { userId }
    })

    if (!gmailToken) {
      throw new Error('No Gmail account connected')
    }

    // Get active contacts from recipients
    const contacts = campaign.recipients
      .filter(r => !r.contact.unsubscribed && !r.contact.bounced)
      .map(r => r.contact)

    if (contacts.length === 0) {
      throw new Error('No active contacts to send to')
    }

    // Update campaign status to sending
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.SENDING,
        sentAt: new Date()
      }
    })

    // Map contacts to match GmailService interface
    const mappedContacts = contacts.map(contact => ({
      id: contact.id,
      email: contact.email,
      firstName: contact.firstName || undefined,
      customFields: contact.variables || {}
    }))

    // Send emails in batches
    const results = await this.gmailService.sendBulkCampaign(
      userId,
      gmailToken.email,
      campaignId,
      mappedContacts
    )

    // Update campaign status
    const successCount = results.filter(r => r.success).length
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.SENT,
        sentCount: successCount
      }
    })

    return {
      sent: successCount,
      failed: results.length - successCount,
      results
    }
  }

  async scheduleCampaign(campaignId: string, userId: string, scheduledFor: Date) {
    return await prisma.campaign.update({
      where: { id: campaignId, userId },
      data: {
        scheduledFor,
        status: CampaignStatus.SCHEDULED
      }
    })
  }

  async pauseCampaign(campaignId: string, userId: string) {
    return await prisma.campaign.update({
      where: { id: campaignId, userId },
      data: {
        status: CampaignStatus.PAUSED
      }
    })
  }

  async cancelCampaign(campaignId: string, userId: string) {
    return await prisma.campaign.update({
      where: { id: campaignId, userId },
      data: {
        status: CampaignStatus.FAILED
      }
    })
  }

  async getCampaignStats(campaignId: string, userId: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, userId },
      include: {
        recipients: {
          include: {
            emailEvents: true
          }
        }
      }
    })

    if (!campaign) {
      throw new Error('Campaign not found')
    }

    const uniqueOpens = new Set()
    const uniqueClicks = new Set()
    let totalOpens = 0
    let totalClicks = 0
    let bounced = 0
    let delivered = 0

    campaign.recipients.forEach(recipient => {
      if (recipient.openedAt) uniqueOpens.add(recipient.contactId)
      if (recipient.clickedAt) uniqueClicks.add(recipient.contactId)
      if (recipient.bouncedAt) bounced++
      if (recipient.status === 'SENT') delivered++
      
      recipient.emailEvents.forEach(event => {
        if (event.eventType === 'OPENED') totalOpens++
        if (event.eventType === 'CLICKED') totalClicks++
      })
    })

    return {
      sent: campaign.sentCount,
      delivered,
      uniqueOpens: uniqueOpens.size,
      totalOpens,
      openRate: campaign.sentCount > 0 ? 
        (uniqueOpens.size / campaign.sentCount * 100).toFixed(2) : 0,
      uniqueClicks: uniqueClicks.size,
      totalClicks,
      clickRate: campaign.sentCount > 0 ? 
        (uniqueClicks.size / campaign.sentCount * 100).toFixed(2) : 0,
      clickToOpenRate: uniqueOpens.size > 0 ?
        (uniqueClicks.size / uniqueOpens.size * 100).toFixed(2) : 0,
      bounced
    }
  }

  async getClickDetails(campaignId: string, userId: string) {
    const clicks = await prisma.emailEvent.findMany({
      where: {
        campaignId,
        eventType: 'CLICKED'
      },
      include: {
        recipient: {
          include: {
            contact: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Group by URL from eventData
    const clicksByUrl = clicks.reduce((acc, click) => {
      const eventData = click.eventData as any
      const url = eventData?.url || 'unknown'
      if (!acc[url]) {
        acc[url] = {
          url,
          totalClicks: 0,
          uniqueClicks: new Set(),
          contacts: []
        }
      }
      
      acc[url].totalClicks++
      if (click.recipient?.contactId) {
        acc[url].uniqueClicks.add(click.recipient.contactId)
      }
      acc[url].contacts.push({
        email: click.recipient?.contact.email || 'unknown',
        name: `${click.recipient?.contact.firstName || ''} ${click.recipient?.contact.lastName || ''}`.trim(),
        clickedAt: click.createdAt
      })
      
      return acc
    }, {} as Record<string, any>)

    return Object.values(clicksByUrl).map(data => ({
      url: data.url,
      totalClicks: data.totalClicks,
      uniqueClicks: data.uniqueClicks.size,
      contacts: data.contacts
    }))
  }

  async processScheduledCampaigns() {
    // This would be called by a cron job
    const now = new Date()
    
    const scheduledCampaigns = await prisma.campaign.findMany({
      where: {
        status: CampaignStatus.SCHEDULED,
        scheduledFor: {
          lte: now
        }
      }
    })

    for (const campaign of scheduledCampaigns) {
      try {
        await this.sendCampaign(campaign.id, campaign.userId)
      } catch (error) {
        console.error(`Failed to send scheduled campaign ${campaign.id}:`, error)
      }
    }
  }
}