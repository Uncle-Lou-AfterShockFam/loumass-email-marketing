import { gmail_v1 } from 'googleapis'
import { GmailClient } from '@/lib/gmail-client'

export class GmailFetchService {
  private gmailClient = new GmailClient()

  async getMessageHeaders(userId: string, gmailAddress: string, messageId: string) {
    try {
      const gmail = await this.gmailClient.getGmailService(userId, gmailAddress)
      
      const message = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'metadata',
        metadataHeaders: ['Message-ID', 'From', 'To', 'Subject', 'Date']
      })

      const headers = message.data.payload?.headers || []
      const messageIdHeader = headers.find((h: any) => h.name === 'Message-ID')?.value
      
      return {
        messageId: messageIdHeader,
        gmailId: message.data.id,
        threadId: message.data.threadId,
        headers: headers
      }
    } catch (error) {
      console.error('Failed to fetch message headers:', error)
      throw error
    }
  }
}