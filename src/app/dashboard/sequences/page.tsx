import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import SequencesTable from '@/components/sequences/SequencesTable'

export default async function SequencesPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const sequences = await prisma.sequence.findMany({
    where: {
      userId: session.user.id
    },
    include: {
      _count: {
        select: {
          enrollments: true
        }
      },
      enrollments: {
        where: {
          status: 'ACTIVE'
        },
        select: {
          id: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  // Calculate metrics for each sequence
  const sequencesWithMetrics = sequences.map(sequence => {
    let steps = []
    try {
      // Handle both array and JSON string formats
      if (typeof sequence.steps === 'string') {
        steps = JSON.parse(sequence.steps)
      } else if (Array.isArray(sequence.steps)) {
        steps = sequence.steps
      } else if (sequence.steps && typeof sequence.steps === 'object') {
        // If it's already an object but not an array, wrap it
        steps = [sequence.steps]
      }
    } catch (error) {
      console.error('Error parsing sequence steps:', error, sequence.id)
      steps = []
    }
    
    return {
      ...sequence,
      steps, // Include parsed steps
      totalEnrollments: sequence._count.enrollments,
      activeEnrollments: sequence.enrollments.length,
      stepCount: steps.length,
      hasConditions: steps.some((step: any) => step?.type === 'condition')
    }
  })

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

      {sequencesWithMetrics.length === 0 ? (
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
        <SequencesTable sequences={sequencesWithMetrics} />
      )}
    </div>
  )
}