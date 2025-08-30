import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
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
            },
            steps: {
              include: {
                emailEvents: true
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
      const totalOpens = enrollment.steps.reduce((sum, step) => 
        sum + step.emailEvents.filter(e => e.eventType === 'OPENED').length, 0)
      const totalClicks = enrollment.steps.reduce((sum, step) => 
        sum + step.emailEvents.filter(e => e.eventType === 'CLICKED').length, 0)
      const totalReplies = enrollment.steps.reduce((sum, step) => 
        sum + step.emailEvents.filter(e => e.eventType === 'REPLIED').length, 0)
      
      // Get last activity date
      const allEvents = enrollment.steps.flatMap(step => step.emailEvents)
      const lastActivity = allEvents.length > 0 
        ? new Date(Math.max(...allEvents.map(e => new Date(e.createdAt).getTime())))
        : null

      // Get current step name
      const currentStepIndex = parseInt(enrollment.currentStep) - 1
      const currentStepName = currentStepIndex >= 0 && currentStepIndex < sequenceSteps.length
        ? sequenceSteps[currentStepIndex].subject || `Step ${currentStepIndex + 1}`
        : 'N/A'

      csvRows.push([
        contact.email,
        `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'N/A',
        contact.company || 'N/A',
        enrollment.status,
        currentStepName,
        new Date(enrollment.enrolledAt).toISOString().split('T')[0],
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