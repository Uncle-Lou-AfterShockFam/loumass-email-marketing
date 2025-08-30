import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import SequenceMetrics from '@/components/sequences/SequenceMetrics'
import SequenceFunnel from '@/components/sequences/SequenceFunnel'
import EnrollmentsList from '@/components/sequences/EnrollmentsList'
import StepPerformance from '@/components/sequences/StepPerformance'
import SequenceActions from '@/components/sequences/SequenceActions'

interface SequencePageProps {
  params: {
    id: string
  }
}

export default async function SequencePage({ params }: SequencePageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const { id } = await params

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
    notFound()
  }

  // Parse sequence steps
  const steps = sequence.steps as any[]

  // Calculate metrics
  const totalEnrollments = sequence.enrollments.length
  const activeEnrollments = sequence.enrollments.filter(e => e.status === 'ACTIVE').length
  const completedEnrollments = sequence.enrollments.filter(e => e.status === 'COMPLETED').length
  const pausedEnrollments = sequence.enrollments.filter(e => e.status === 'PAUSED').length

  // Calculate step-level metrics
  const stepMetrics = steps.map((step, index) => {
    const recipientsAtStep = sequence.enrollments.filter(e => {
      const currentStepIndex = parseInt(e.currentStep)
      return currentStepIndex >= index
    }).length

    const emailsSent = sequence.enrollments.reduce((acc, enrollment) => {
      const relevantSteps = enrollment.steps.filter(s => 
        s.stepNumber === index + 1 && s.sentAt !== null
      )
      return acc + relevantSteps.length
    }, 0)

    const opens = sequence.enrollments.reduce((acc, enrollment) => {
      const relevantSteps = enrollment.steps.filter(s => 
        s.stepNumber === index + 1 && s.openedAt !== null
      )
      return acc + relevantSteps.length
    }, 0)

    const clicks = sequence.enrollments.reduce((acc, enrollment) => {
      const relevantSteps = enrollment.steps.filter(s => 
        s.stepNumber === index + 1 && s.clickedAt !== null
      )
      return acc + relevantSteps.length
    }, 0)

    const replies = sequence.enrollments.reduce((acc, enrollment) => {
      const relevantSteps = enrollment.steps.filter(s => 
        s.stepNumber === index + 1 && s.repliedAt !== null
      )
      return acc + relevantSteps.length
    }, 0)

    return {
      stepId: step.id,
      stepNumber: index + 1,
      type: step.type,
      subject: step.subject,
      trackingEnabled: step.trackingEnabled,
      recipientsAtStep,
      emailsSent,
      opens,
      clicks,
      replies,
      dropOff: index > 0 ? 
        ((stepMetrics[index - 1]?.recipientsAtStep || 0) - recipientsAtStep) : 0,
      openRate: emailsSent > 0 ? Math.round((opens / emailsSent) * 100) : 0,
      clickRate: emailsSent > 0 ? Math.round((clicks / emailsSent) * 100) : 0,
      replyRate: emailsSent > 0 ? Math.round((replies / emailsSent) * 100) : 0
    }
  })

  // Calculate funnel data
  const funnelData = stepMetrics.filter(s => s.type === 'email').map(step => ({
    step: `Step ${step.stepNumber}`,
    subject: step.subject || 'Email',
    recipients: step.recipientsAtStep,
    sent: step.emailsSent,
    opened: step.opens,
    clicked: step.clicks,
    replied: step.replies
  }))

  // Calculate engagement timeline
  const engagementTimeline = sequence.enrollments.reduce((acc, enrollment) => {
    enrollment.steps.forEach(sequenceStep => {
      sequenceStep.emailEvents.forEach(event => {
        const date = new Date(event.createdAt).toLocaleDateString()
        if (!acc[date]) {
          acc[date] = { opens: 0, clicks: 0, replies: 0 }
        }
        if (event.eventType === 'OPENED') acc[date].opens++
        if (event.eventType === 'CLICKED') acc[date].clicks++
        if (event.eventType === 'REPLIED') acc[date].replies++
      })
    })
    return acc
  }, {} as Record<string, { opens: number; clicks: number; replies: number }>)

  const metrics = {
    totalEnrollments,
    activeEnrollments,
    completedEnrollments,
    pausedEnrollments,
    completionRate: totalEnrollments > 0 ? 
      Math.round((completedEnrollments / totalEnrollments) * 100) : 0,
    averageTimeToComplete: calculateAverageTimeToComplete(sequence.enrollments),
    totalOpens: stepMetrics.reduce((sum, s) => sum + s.opens, 0),
    totalClicks: stepMetrics.reduce((sum, s) => sum + s.clicks, 0),
    totalReplies: stepMetrics.reduce((sum, s) => sum + s.replies, 0),
    overallEngagement: calculateOverallEngagement(stepMetrics)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <Link 
              href="/dashboard/sequences"
              className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Sequences
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{sequence.name}</h1>
            <div className="flex items-center gap-4 mt-2">
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                sequence.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                sequence.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {sequence.status}
              </span>
              <span className="text-sm text-gray-500">
                {steps.length} steps • {totalEnrollments} enrollments
              </span>
              {sequence.trackingEnabled && (
                <span className="text-sm text-green-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Tracking Enabled
                </span>
              )}
            </div>
          </div>
          
          <SequenceActions 
            sequence={sequence}
            enrollmentCount={totalEnrollments}
          />
        </div>
      </div>

      {/* Metrics Overview */}
      <SequenceMetrics 
        metrics={metrics}
        trackingEnabled={sequence.trackingEnabled}
      />

      {/* Funnel Visualization */}
      <SequenceFunnel 
        funnelData={funnelData}
        trackingEnabled={sequence.trackingEnabled}
      />

      {/* Step Performance */}
      <StepPerformance 
        steps={stepMetrics}
        trackingEnabled={sequence.trackingEnabled}
      />

      {/* Engagement Timeline */}
      {sequence.trackingEnabled && Object.keys(engagementTimeline).length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Engagement Timeline</h2>
          <div className="space-y-4">
            {Object.entries(engagementTimeline)
              .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
              .map(([date, data]) => (
                <div key={date} className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm text-gray-600">{date}</span>
                  <div className="flex gap-6">
                    <span className="text-sm">
                      <span className="font-medium">{data.opens}</span> opens
                    </span>
                    <span className="text-sm">
                      <span className="font-medium">{data.clicks}</span> clicks
                    </span>
                    <span className="text-sm">
                      <span className="font-medium">{data.replies}</span> replies
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Enrollments List */}
      <EnrollmentsList 
        enrollments={sequence.enrollments}
        steps={steps}
        trackingEnabled={sequence.trackingEnabled}
      />
    </div>
  )
}

function calculateAverageTimeToComplete(enrollments: any[]): string {
  const completedEnrollments = enrollments.filter(e => e.status === 'COMPLETED')
  if (completedEnrollments.length === 0) return 'N/A'
  
  const totalHours = completedEnrollments.reduce((sum, e) => {
    const enrolled = new Date(e.enrolledAt).getTime()
    const completed = new Date(e.completedAt || e.updatedAt).getTime()
    return sum + ((completed - enrolled) / (1000 * 60 * 60))
  }, 0)
  
  const avgHours = totalHours / completedEnrollments.length
  
  if (avgHours < 24) {
    return `${Math.round(avgHours)} hours`
  } else {
    return `${Math.round(avgHours / 24)} days`
  }
}

function calculateOverallEngagement(stepMetrics: any[]): number {
  const emailSteps = stepMetrics.filter(s => s.type === 'email')
  if (emailSteps.length === 0) return 0
  
  const avgOpenRate = emailSteps.reduce((sum, s) => sum + s.openRate, 0) / emailSteps.length
  const avgClickRate = emailSteps.reduce((sum, s) => sum + s.clickRate, 0) / emailSteps.length
  const avgReplyRate = emailSteps.reduce((sum, s) => sum + s.replyRate, 0) / emailSteps.length
  
  // Weighted average: opens (40%), clicks (35%), replies (25%)
  return Math.round((avgOpenRate * 0.4) + (avgClickRate * 0.35) + (avgReplyRate * 0.25))
}