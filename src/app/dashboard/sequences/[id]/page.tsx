'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import SequenceMetrics from '@/components/sequences/SequenceMetrics'
import SequenceFunnel from '@/components/sequences/SequenceFunnel'
import EnrollmentsList from '@/components/sequences/EnrollmentsList'
import StepPerformance from '@/components/sequences/StepPerformance'
import SequenceActions from '@/components/sequences/SequenceActions'
import { toast } from 'react-hot-toast'

interface SequenceData {
  id: string
  name: string
  description?: string
  status: string
  triggerType: string
  steps: any[]
  trackingEnabled: boolean
  createdAt: string
  updatedAt: string
  enrollments: any[]
}

interface StepMetric {
  stepId: string
  stepNumber: number
  type: string
  subject: string
  trackingEnabled: boolean
  recipientsAtStep: number
  emailsSent: number
  opens: number
  clicks: number
  replies: number
  dropOff: number
  openRate: number
  clickRate: number
  replyRate: number
}

export default function SequencePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const [sequence, setSequence] = useState<SequenceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<any>(null)
  const [stepMetrics, setStepMetrics] = useState<StepMetric[]>([])
  const [funnelData, setFunnelData] = useState<any[]>([])
  const [engagementTimeline, setEngagementTimeline] = useState<Record<string, any>>({})

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.id) {
      router.push('/auth/signin')
      return
    }

    if (params?.id) {
      fetchSequence(params.id as string)
    }
  }, [session, status, router, params])

  const fetchSequence = async (id: string) => {
    try {
      setLoading(true)
      console.log('Fetching sequence:', id)
      const response = await fetch(`/api/sequences/${id}`)
      
      console.log('Response status:', response.status)
      
      if (response.status === 404) {
        router.push('/dashboard/sequences')
        toast.error('Sequence not found')
        return
      }

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        throw new Error(errorData.error || 'Failed to fetch sequence')
      }

      const data = await response.json()
      console.log('Sequence data:', data)
      
      // Process the sequence data
      const sequenceData = data.sequence
      let steps = []
      try {
        if (typeof sequenceData.steps === 'string') {
          steps = JSON.parse(sequenceData.steps)
        } else if (Array.isArray(sequenceData.steps)) {
          steps = sequenceData.steps
        } else if (sequenceData.steps && typeof sequenceData.steps === 'object') {
          steps = [sequenceData.steps]
        }
      } catch (error) {
        console.error('Error parsing steps:', error)
        steps = []
      }

      sequenceData.steps = steps
      setSequence(sequenceData)

      // Calculate metrics
      const totalEnrollments = sequenceData.enrollments?.length || 0
      const activeEnrollments = sequenceData.enrollments?.filter((e: any) => e.status === 'ACTIVE').length || 0
      const completedEnrollments = sequenceData.enrollments?.filter((e: any) => e.status === 'COMPLETED').length || 0
      const pausedEnrollments = sequenceData.enrollments?.filter((e: any) => e.status === 'PAUSED').length || 0

      // Calculate step metrics - first pass without dropOff
      const stepMetricsWithoutDropOff = steps.map((step: any, index: number) => {
        const recipientsAtStep = sequenceData.enrollments?.filter((e: any) => {
          const currentStepIndex = typeof e.currentStep === 'string' ? parseInt(e.currentStep) : e.currentStep
          return currentStepIndex >= index
        }).length || 0

        // Placeholder values for tracking data
        const emailsSent = 0
        const opens = 0
        const clicks = 0
        const replies = 0

        return {
          stepId: step.id,
          stepNumber: index + 1,
          type: step.type,
          subject: step.subject,
          trackingEnabled: step.trackingEnabled || false,
          recipientsAtStep,
          emailsSent,
          opens,
          clicks,
          replies,
          openRate: emailsSent > 0 ? Math.round((opens / emailsSent) * 100) : 0,
          clickRate: emailsSent > 0 ? Math.round((clicks / emailsSent) * 100) : 0,
          replyRate: emailsSent > 0 ? Math.round((replies / emailsSent) * 100) : 0
        }
      })

      // Calculate dropOff in second pass
      const calculatedStepMetrics: StepMetric[] = stepMetricsWithoutDropOff.map((step: any, index: number) => ({
        ...step,
        dropOff: index > 0 ? 
          ((stepMetricsWithoutDropOff[index - 1]?.recipientsAtStep || 0) - step.recipientsAtStep) : 0
      }))

      setStepMetrics(calculatedStepMetrics)

      // Calculate funnel data
      const calculatedFunnelData = calculatedStepMetrics.filter(s => s.type === 'email').map(step => ({
        step: `Step ${step.stepNumber}`,
        subject: step.subject || 'Email',
        recipients: step.recipientsAtStep,
        sent: step.emailsSent,
        opened: step.opens,
        clicked: step.clicks,
        replied: step.replies
      }))

      setFunnelData(calculatedFunnelData)

      // Calculate overall metrics
      const calculatedMetrics = {
        totalEnrollments,
        activeEnrollments,
        completedEnrollments,
        pausedEnrollments,
        completionRate: totalEnrollments > 0 ? 
          Math.round((completedEnrollments / totalEnrollments) * 100) : 0,
        averageTimeToComplete: calculateAverageTimeToComplete(sequenceData.enrollments || []),
        totalOpens: calculatedStepMetrics.reduce((sum, s) => sum + s.opens, 0),
        totalClicks: calculatedStepMetrics.reduce((sum, s) => sum + s.clicks, 0),
        totalReplies: calculatedStepMetrics.reduce((sum, s) => sum + s.replies, 0),
        overallEngagement: calculateOverallEngagement(calculatedStepMetrics)
      }

      setMetrics(calculatedMetrics)
      setEngagementTimeline({}) // Placeholder for engagement timeline

    } catch (error) {
      console.error('Error loading sequence:', error)
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to load sequence')
      }
      router.push('/dashboard/sequences')
    } finally {
      setLoading(false)
    }
  }

  const calculateAverageTimeToComplete = (enrollments: any[]): string => {
    const completedEnrollments = enrollments.filter(e => e.status === 'COMPLETED')
    if (completedEnrollments.length === 0) return 'N/A'
    
    const totalHours = completedEnrollments.reduce((sum, e) => {
      const enrolled = new Date(e.createdAt).getTime()
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

  const calculateOverallEngagement = (stepMetrics: StepMetric[]): number => {
    const emailSteps = stepMetrics.filter(s => s.type === 'email')
    if (emailSteps.length === 0) return 0
    
    const avgOpenRate = emailSteps.reduce((sum, s) => sum + s.openRate, 0) / emailSteps.length
    const avgClickRate = emailSteps.reduce((sum, s) => sum + s.clickRate, 0) / emailSteps.length
    const avgReplyRate = emailSteps.reduce((sum, s) => sum + s.replyRate, 0) / emailSteps.length
    
    // Weighted average: opens (40%), clicks (35%), replies (25%)
    return Math.round((avgOpenRate * 0.4) + (avgClickRate * 0.35) + (avgReplyRate * 0.25))
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!sequence) {
    return null
  }

  const totalEnrollments = sequence.enrollments?.length || 0

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
                {sequence.steps.length} steps • {totalEnrollments} enrollments
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
      {metrics && (
        <SequenceMetrics 
          metrics={metrics}
          trackingEnabled={sequence.trackingEnabled}
        />
      )}

      {/* Funnel Visualization */}
      {funnelData.length > 0 && (
        <SequenceFunnel 
          funnelData={funnelData}
          trackingEnabled={sequence.trackingEnabled}
        />
      )}

      {/* Step Performance */}
      {stepMetrics.length > 0 && (
        <StepPerformance 
          steps={stepMetrics}
          trackingEnabled={sequence.trackingEnabled}
        />
      )}

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
      {sequence.enrollments && (
        <EnrollmentsList 
          enrollments={sequence.enrollments}
          steps={sequence.steps}
          trackingEnabled={sequence.trackingEnabled}
        />
      )}
    </div>
  )
}