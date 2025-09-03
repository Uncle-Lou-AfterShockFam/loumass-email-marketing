import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const lists = await prisma.emailList.findMany({
      where: { userId: session.user.id },
      include: {
        _count: {
          select: {
            contacts: true,
            segments: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(lists)
  } catch (error) {
    console.error('Error fetching lists:', error)
    return NextResponse.json({ error: 'Failed to fetch lists' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, description, customFields = [] } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const list = await prisma.emailList.create({
      data: {
        userId: session.user.id,
        name,
        description,
        customFields: customFields.length > 0 ? customFields : undefined
      }
    })

    return NextResponse.json(list)
  } catch (error) {
    console.error('Error creating list:', error)
    return NextResponse.json({ error: 'Failed to create list' }, { status: 500 })
  }
}