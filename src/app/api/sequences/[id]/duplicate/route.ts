import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/sequences/[id]/duplicate - Duplicate a sequence
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the original sequence
    const originalSequence = await prisma.sequence.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!originalSequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })
    }

    // Parse the request body for optional custom name
    const body = await request.json().catch(() => ({}))
    const customName = body.name

    // Generate a unique name for the duplicate
    const baseName = customName || originalSequence.name
    let duplicateName = `${baseName} (Copy)`
    let nameCounter = 1

    // Check for existing sequences with the same name and increment counter
    while (true) {
      const existingSequence = await prisma.sequence.findFirst({
        where: {
          userId: session.user.id,
          name: duplicateName
        }
      })
      
      if (!existingSequence) break
      
      nameCounter++
      duplicateName = `${baseName} (Copy ${nameCounter})`
    }

    // Create the duplicate sequence
    const duplicatedSequence = await prisma.sequence.create({
      data: {
        userId: session.user.id,
        name: duplicateName,
        description: originalSequence.description,
        triggerType: originalSequence.triggerType,
        steps: originalSequence.steps as any, // Type assertion for JSON field
        trackingEnabled: originalSequence.trackingEnabled,
        status: 'DRAFT' // Always set duplicated sequences to DRAFT status
      }
    })

    console.log(`Duplicated sequence ${id} as ${duplicatedSequence.id} with name "${duplicateName}"`)

    return NextResponse.json({
      success: true,
      sequence: duplicatedSequence,
      message: `Sequence duplicated as "${duplicateName}"`
    })

  } catch (error) {
    console.error('Error duplicating sequence:', error)
    return NextResponse.json({ 
      error: 'Failed to duplicate sequence' 
    }, { status: 500 })
  }
}