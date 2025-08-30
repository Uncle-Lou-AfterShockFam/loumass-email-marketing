import { prisma } from '@/lib/prisma'

interface ContactData {
  email: string
  firstName?: string
  lastName?: string
  company?: string
  phone?: string
  customFields?: Record<string, any>
  tags?: string[]
}

export class ContactService {
  async createContact(userId: string, data: ContactData) {
    return await prisma.contact.upsert({
      where: {
        userId_email: {
          userId,
          email: data.email
        }
      },
      update: {
        firstName: data.firstName,
        lastName: data.lastName,
        company: data.company,
        phone: data.phone,
        variables: data.customFields,
        tags: data.tags || []
      },
      create: {
        userId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        company: data.company,
        phone: data.phone,
        variables: data.customFields,
        tags: data.tags || [],
        unsubscribed: false,
        bounced: false
      }
    })
  }

  async importContacts(userId: string, csvData: string): Promise<{
    imported: number
    failed: number
    errors: string[]
  }> {
    const lines = csvData.split('\n').filter(line => line.trim())
    if (lines.length < 2) {
      return { imported: 0, failed: 0, errors: ['CSV must have headers and at least one row'] }
    }

    const headers = lines[0].split(',').map(h => h.trim())
    const emailIndex = headers.findIndex(h => 
      h.toLowerCase() === 'email' || h.toLowerCase() === 'email address'
    )

    if (emailIndex === -1) {
      return { imported: 0, failed: 0, errors: ['CSV must have an email column'] }
    }

    let imported = 0
    let failed = 0
    const errors: string[] = []

    // Map standard fields
    const fieldMapping = {
      firstName: headers.findIndex(h => 
        ['first name', 'firstname', 'first'].includes(h.toLowerCase())
      ),
      lastName: headers.findIndex(h => 
        ['last name', 'lastname', 'last'].includes(h.toLowerCase())
      ),
      company: headers.findIndex(h => 
        ['company', 'organization', 'org'].includes(h.toLowerCase())
      ),
      phone: headers.findIndex(h => 
        ['phone', 'phone number', 'mobile'].includes(h.toLowerCase())
      )
    }

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = this.parseCSVLine(lines[i])
        const email = values[emailIndex]?.trim()

        if (!email || !this.isValidEmail(email)) {
          failed++
          errors.push(`Row ${i + 1}: Invalid email`)
          continue
        }

        // Build contact data
        const contactData: ContactData = {
          email,
          firstName: fieldMapping.firstName > -1 ? values[fieldMapping.firstName]?.trim() : undefined,
          lastName: fieldMapping.lastName > -1 ? values[fieldMapping.lastName]?.trim() : undefined,
          company: fieldMapping.company > -1 ? values[fieldMapping.company]?.trim() : undefined,
          phone: fieldMapping.phone > -1 ? values[fieldMapping.phone]?.trim() : undefined,
          customFields: {}
        }

        // Add custom fields
        headers.forEach((header, index) => {
          const standardFields = ['email', 'first name', 'firstname', 'first', 
                                 'last name', 'lastname', 'last', 'company', 
                                 'organization', 'org', 'phone', 'phone number', 'mobile']
          
          if (!standardFields.includes(header.toLowerCase()) && values[index]) {
            contactData.customFields![header] = values[index].trim()
          }
        })

        await this.createContact(userId, contactData)
        imported++
      } catch (error) {
        failed++
        errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return { imported, failed, errors }
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }

    result.push(current)
    return result
  }

  private isValidEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
  }

  async getContacts(userId: string, filters?: {
    unsubscribed?: boolean
    bounced?: boolean
    tags?: string[]
    search?: string
  }) {
    const where: any = { userId }

    if (filters?.unsubscribed !== undefined) {
      where.unsubscribed = filters.unsubscribed
    }

    if (filters?.bounced !== undefined) {
      where.bounced = filters.bounced
    }

    if (filters?.tags && filters.tags.length > 0) {
      where.tags = {
        hasSome: filters.tags
      }
    }

    if (filters?.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { company: { contains: filters.search, mode: 'insensitive' } }
      ]
    }

    return await prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })
  }

  async updateContact(id: string, userId: string, data: Partial<ContactData>) {
    return await prisma.contact.update({
      where: {
        id,
        userId
      },
      data
    })
  }

  async deleteContact(id: string, userId: string) {
    return await prisma.contact.delete({
      where: {
        id,
        userId
      }
    })
  }

  async unsubscribeContact(email: string) {
    return await prisma.contact.updateMany({
      where: { email },
      data: {
        unsubscribed: true,
        updatedAt: new Date()
      }
    })
  }

}