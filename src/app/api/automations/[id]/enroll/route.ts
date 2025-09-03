import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AutomationExecutor } from '@/services/automation-executor'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { contactIds } = body

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json({ error: 'Contact IDs are required' }, { status: 400 })
    }

    const resolvedParams = await params
    
    // Verify automation exists and belongs to user
    const automation = await prisma.automation.findFirst({
      where: {
        id: resolvedParams.id,
        userId: session.user.id
      }
    })

    if (!automation) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 })
    }

    // Verify contacts belong to user
    const validContacts = await prisma.contact.findMany({
      where: {
        id: { in: contactIds },
        userId: session.user.id
      },
      select: { id: true }
    })

    if (validContacts.length !== contactIds.length) {
      return NextResponse.json({ 
        error: 'Some contacts not found or not accessible' 
      }, { status: 400 })
    }

    // Enroll contacts using the executor
    const executor = new AutomationExecutor()
    await executor.enrollContactsManually(resolvedParams.id, contactIds)

    return NextResponse.json({
      success: true,
      enrolled: contactIds.length,
      message: `${contactIds.length} contact(s) enrolled in automation`
    })

  } catch (error) {
    console.error('Error enrolling contacts in automation:', error)
    
    if (error instanceof Error && error.message.includes('not found or not active')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to enroll contacts' 
    }, { status: 500 })
  }
}