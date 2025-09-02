'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SequencesTable from '@/components/sequences/SequencesTable'
import { toast } from 'react-hot-toast'

interface Sequence {
  id: string
  name: string
  description?: string
  status: string
  triggerType: string
  sequenceType?: 'STANDALONE' | 'CAMPAIGN_FOLLOWUP'
  steps: any
  trackingEnabled: boolean
  totalEnrollments: number
  activeEnrollments: number
  stepCount: number
  hasConditions: boolean
  createdAt: string
  updatedAt: string
}

export default function SequencesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.id) {
      router.push('/auth/signin')
      return
    }

    fetchSequences()
  }, [session, status, router])

  const fetchSequences = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/sequences')
      
      if (!response.ok) {
        throw new Error('Failed to fetch sequences')
      }

      const data = await response.json()
      
      // Process sequences with metrics
      const sequencesWithMetrics = (data.sequences || []).map((sequence: any) => {
        let steps = []
        try {
          if (typeof sequence.steps === 'string') {
            steps = JSON.parse(sequence.steps)
          } else if (Array.isArray(sequence.steps)) {
            steps = sequence.steps
          } else if (sequence.steps && typeof sequence.steps === 'object') {
            steps = [sequence.steps]
          }
        } catch (error) {
          console.error('Error parsing steps for sequence:', sequence.id, error)
          steps = []
        }

        return {
          ...sequence,
          steps,
          totalEnrollments: sequence.totalEnrollments || 0,
          activeEnrollments: sequence.activeEnrollments || 0,
          stepCount: steps.length,
          hasConditions: steps.some((step: any) => step?.type === 'condition'),
          createdAt: sequence.createdAt || new Date().toISOString(),
          updatedAt: sequence.updatedAt || new Date().toISOString()
        }
      })

      setSequences(sequencesWithMetrics)
    } catch (error) {
      console.error('Error loading sequences:', error)
      toast.error('Failed to load sequences')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Email Sequences</h1>
          <p className="mt-2 text-gray-600">
            Create automated email workflows with conditional logic
          </p>
        </div>
        <Link
          href="/dashboard/sequences/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Sequence
        </Link>
      </div>

      {sequences.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No sequences yet</h3>
          <p className="text-gray-600 mb-4">
            Create your first automated email sequence to nurture leads and engage customers
          </p>
          <Link
            href="/dashboard/sequences/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Your First Sequence
          </Link>
        </div>
      ) : (
        <SequencesTable sequences={sequences} />
      )}
    </div>
  )
}