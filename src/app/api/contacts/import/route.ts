import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
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

    const { csvData } = await request.json()
    if (!csvData) {
      return NextResponse.json({ error: 'No CSV data provided' }, { status: 400 })
    }

    // Parse CSV
    const lines = csvData.trim().split('\n')
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV must have headers and at least one row' }, { status: 400 })
    }

    // Get headers
    const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase())
    const emailIndex = headers.indexOf('email')
    
    if (emailIndex === -1) {
      return NextResponse.json({ error: 'CSV must have an "email" column' }, { status: 400 })
    }

    const firstNameIndex = headers.indexOf('firstname')
    const lastNameIndex = headers.indexOf('lastname')
    const companyIndex = headers.indexOf('company')
    const phoneIndex = headers.indexOf('phone')

    // Process contacts
    const contacts = []
    const errors = []
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v: string) => v.trim())
      const email = values[emailIndex]?.toLowerCase()
      
      if (!email || !email.includes('@')) {
        errors.push(`Row ${i + 1}: Invalid email`)
        continue
      }

      contacts.push({
        email,
        firstName: firstNameIndex !== -1 ? values[firstNameIndex] || null : null,
        lastName: lastNameIndex !== -1 ? values[lastNameIndex] || null : null,
        company: companyIndex !== -1 ? values[companyIndex] || null : null,
        phone: phoneIndex !== -1 ? values[phoneIndex] || null : null,
        userId: user.id
      })
    }

    if (contacts.length === 0) {
      return NextResponse.json({ 
        error: 'No valid contacts to import',
        errors 
      }, { status: 400 })
    }

    // Bulk upsert contacts
    let imported = 0
    let updated = 0

    for (const contact of contacts) {
      const existing = await prisma.contact.findUnique({
        where: {
          userId_email: {
            userId: user.id,
            email: contact.email
          }
        }
      })

      if (existing) {
        await prisma.contact.update({
          where: { id: existing.id },
          data: {
            firstName: contact.firstName || existing.firstName,
            lastName: contact.lastName || existing.lastName,
            company: contact.company || existing.company,
            phone: contact.phone || existing.phone
          }
        })
        updated++
      } else {
        await prisma.contact.create({
          data: contact
        })
        imported++
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      updated,
      total: imported + updated,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Contact import error:', error)
    return NextResponse.json(
      { error: 'Failed to import contacts' },
      { status: 500 }
    )
  }
}