import { gmail_v1 } from 'googleapis'
import { GmailClient } from '@/lib/gmail-client'

export class GmailFetchService {
  private gmailClient = new GmailClient()

  async getMessageHeaders(userId: string, gmailAddress: string, messageId: string) {
    console.log('🔍 Fetching Message-ID header for message:', messageId)
    try {
      const gmail = await this.gmailClient.getGmailService(userId, gmailAddress)
      
      const message = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'metadata',
        metadataHeaders: ['Message-ID', 'From', 'To', 'Subject', 'Date']
      })

      const headers = message.data.payload?.headers || []
      console.log('📧 Headers fetched:', headers.map((h: any) => `${h.name}: ${h.value?.substring(0, 50)}...`))
      
      // Gmail returns 'Message-Id' with lowercase 'd', so we need case-insensitive comparison
      const messageIdHeader = headers.find((h: any) => 
        h.name.toLowerCase() === 'message-id'
      )?.value
      console.log('✅ Message-ID header found:', messageIdHeader)
      
      return {
        messageId: messageIdHeader,
        gmailId: message.data.id,
        threadId: message.data.threadId,
        headers: headers
      }
    } catch (error) {
      console.error('❌ Failed to fetch message headers:', error)
      throw error
    }
  }

  async getMessageDetails(userId: string, gmailAddress: string, messageId: string) {
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
      console.error('Failed to fetch message details:', error)
      throw error
    }
  }

  async getFullMessage(userId: string, gmailAddress: string, messageId: string) {
    console.log('📧 Fetching full message content for:', messageId)
    try {
      const gmail = await this.gmailClient.getGmailService(userId, gmailAddress)
      
      const message = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      })

      const headers = message.data.payload?.headers || []
      const messageIdHeader = headers.find((h: any) => 
        h.name.toLowerCase() === 'message-id'
      )?.value
      
      // Extract message body
      let htmlBody = ''
      let textBody = ''
      
      const extractBody = (parts: any[]): void => {
        for (const part of parts || []) {
          if (part.mimeType === 'text/html' && part.body?.data) {
            htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8')
          } else if (part.mimeType === 'text/plain' && part.body?.data) {
            textBody = Buffer.from(part.body.data, 'base64').toString('utf-8')
          } else if (part.parts) {
            extractBody(part.parts)
          }
        }
      }
      
      if (message.data.payload?.parts) {
        extractBody(message.data.payload.parts)
      } else if (message.data.payload?.body?.data) {
        const bodyData = Buffer.from(message.data.payload.body.data, 'base64').toString('utf-8')
        if (message.data.payload?.mimeType === 'text/html') {
          htmlBody = bodyData
        } else {
          textBody = bodyData
        }
      }
      
      console.log('✅ Message content fetched - HTML:', htmlBody.length, 'chars, Text:', textBody.length, 'chars')
      
      return {
        messageId: messageIdHeader,
        gmailId: message.data.id,
        threadId: message.data.threadId,
        headers: headers,
        htmlBody,
        textBody,
        subject: headers.find((h: any) => h.name === 'Subject')?.value || '',
        from: headers.find((h: any) => h.name === 'From')?.value || '',
        date: headers.find((h: any) => h.name === 'Date')?.value || ''
      }
    } catch (error) {
      console.error('❌ Failed to fetch full message:', error)
      throw error
    }
  }

  async getThreadMessages(userId: string, gmailAddress: string, threadId: string) {
    console.log('🧵 Fetching entire thread:', threadId)
    try {
      const gmail = await this.gmailClient.getGmailService(userId, gmailAddress)
      
      // Get the entire thread with all messages
      const thread = await gmail.users.threads.get({
        userId: 'me',
        id: threadId,
        format: 'full'
      })

      const messages = []
      
      // Process each message in the thread
      for (const message of thread.data.messages || []) {
        const headers = message.payload?.headers || []
        
        // Extract message body
        let htmlBody = ''
        let textBody = ''
        
        const extractBody = (parts: any[]): void => {
          for (const part of parts || []) {
            if (part.mimeType === 'text/html' && part.body?.data) {
              htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8')
            } else if (part.mimeType === 'text/plain' && part.body?.data) {
              textBody = Buffer.from(part.body.data, 'base64').toString('utf-8')
            } else if (part.parts) {
              extractBody(part.parts)
            }
          }
        }
        
        if (message.payload?.parts) {
          extractBody(message.payload.parts)
        } else if (message.payload?.body?.data) {
          const bodyData = Buffer.from(message.payload.body.data, 'base64').toString('utf-8')
          if (message.payload?.mimeType === 'text/html') {
            htmlBody = bodyData
          } else {
            textBody = bodyData
          }
        }
        
        messages.push({
          gmailId: message.id,
          messageIdHeader: headers.find((h: any) => h.name.toLowerCase() === 'message-id')?.value,
          htmlBody,
          textBody,
          subject: headers.find((h: any) => h.name === 'Subject')?.value || '',
          from: headers.find((h: any) => h.name === 'From')?.value || '',
          to: headers.find((h: any) => h.name === 'To')?.value || '',
          date: headers.find((h: any) => h.name === 'Date')?.value || '',
          internalDate: message.internalDate
        })
      }
      
      // Sort messages by internal date (oldest first)
      messages.sort((a, b) => parseInt(a.internalDate) - parseInt(b.internalDate))
      
      console.log(`✅ Thread fetched with ${messages.length} messages`)
      return messages
    } catch (error) {
      console.error('❌ Failed to fetch thread messages:', error)
      throw error
    }
  }
}