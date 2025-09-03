import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TemplateProcessor } from '@/services/template-processor'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const category = searchParams.get('category')

    const templates = await prisma.emailTemplate.findMany({
      where: {
        userId: session.user.id,
        ...(category && { category })
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, subject, content, category } = body

    if (!name || !subject || !content) {
      return NextResponse.json(
        { error: 'Name, subject, and content are required' },
        { status: 400 }
      )
    }

    // Validate template syntax
    const processor = new TemplateProcessor()
    const validation = processor.validateTemplate(content)
    
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Template syntax errors', errors: validation.errors },
        { status: 400 }
      )
    }

    // Extract variables from template
    const variables = processor.extractVariables(content + ' ' + subject)

    const template = await prisma.emailTemplate.create({
      data: {
        userId: session.user.id,
        name,
        subject,
        content,
        category: category || 'general',
        variables
      }
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}