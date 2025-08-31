import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }


    // Get sequence with all related data
    const sequence = await prisma.sequence.findUnique({
      where: {
        id,
        userId: session.user.id
      },
      include: {
        enrollments: {
          include: {
            contact: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
                company: true
              }
            }
          }
        }
      }
    })

    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })
    }

    // Parse sequence steps
    const sequenceSteps = sequence.steps as any[]
    
    // Generate CSV data
    const csvRows = []
    
    // Header row
    csvRows.push([
      'Contact Email',
      'Contact Name',
      'Company',
      'Enrollment Status',
      'Current Step',
      'Enrolled At',
      'Completed At',
      'Total Opens',
      'Total Clicks',
      'Total Replies',
      'Last Activity'
    ])

    // Data rows
    sequence.enrollments.forEach(enrollment => {
      const contact = enrollment.contact
      // TODO: Implement stats once SequenceStep model is added
      const totalOpens = 0 // Not tracked in current schema
      const totalClicks = 0 // Not tracked in current schema
      const totalReplies = 0 // Not tracked in current schema
      
      // Get last activity date - use enrollment dates for now
      const lastActivity = enrollment.updatedAt > enrollment.createdAt 
        ? enrollment.updatedAt
        : enrollment.createdAt

      // Get current step name
      const currentStepIndex = enrollment.currentStep
      const currentStepName = currentStepIndex >= 0 && currentStepIndex < sequenceSteps.length
        ? sequenceSteps[currentStepIndex].subject || `Step ${currentStepIndex + 1}`
        : 'N/A'

      csvRows.push([
        contact.email,
        `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'N/A',
        contact.company || 'N/A',
        enrollment.status,
        currentStepName,
        new Date(enrollment.createdAt).toISOString().split('T')[0],
        enrollment.completedAt ? new Date(enrollment.completedAt).toISOString().split('T')[0] : 'N/A',
        totalOpens,
        totalClicks,
        totalReplies,
        lastActivity ? lastActivity.toISOString().split('T')[0] : 'N/A'
      ])
    })

    // Convert to CSV string
    const csvContent = csvRows
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    // Add sequence summary at the top
    const summaryRows = [
      ['Sequence Report Summary'],
      ['Sequence Name', sequence.name],
      ['Status', sequence.status],
      ['Total Enrollments', sequence.enrollments.length],
      ['Active Enrollments', sequence.enrollments.filter(e => e.status === 'ACTIVE').length],
      ['Completed Enrollments', sequence.enrollments.filter(e => e.status === 'COMPLETED').length],
      ['Paused Enrollments', sequence.enrollments.filter(e => e.status === 'PAUSED').length],
      ['Total Steps', sequenceSteps.length],
      ['Generated At', new Date().toISOString()],
      [''],
      ['Enrollment Details']
    ]

    const fullCsvContent = [
      ...summaryRows.map(row => row.map(field => `"${field}"`).join(',')),
      '',
      ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n')

    return NextResponse.json({ 
      csvData: fullCsvContent,
      sequenceName: sequence.name,
      totalEnrollments: sequence.enrollments.length
    })

  } catch (error) {
    console.error('Error exporting sequence:', error)
    return NextResponse.json(
      { error: 'Failed to export sequence' },
      { status: 500 }
    )
  }
}