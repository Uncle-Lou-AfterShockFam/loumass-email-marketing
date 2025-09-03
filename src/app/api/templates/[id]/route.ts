import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TemplateProcessor } from '@/services/template-processor'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const template = await prisma.emailTemplate.findFirst({
      where: {
        id: resolvedParams.id,
        userId: session.user.id
      }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const body = await req.json()
    const { name, subject, content, category } = body

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

    const template = await prisma.emailTemplate.update({
      where: {
        id: resolvedParams.id,
        userId: session.user.id
      },
      data: {
        name,
        subject,
        content,
        category,
        variables
      }
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error updating template:', error)
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    
    await prisma.emailTemplate.delete({
      where: {
        id: resolvedParams.id,
        userId: session.user.id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
  }
}