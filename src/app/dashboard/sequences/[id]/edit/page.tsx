'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import SequenceBuilder from '@/components/sequences/SequenceBuilder'

export default function EditSequencePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const [sequence, setSequence] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

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
      const response = await fetch(`/api/sequences/${id}`)
      
      if (response.status === 404) {
        toast.error('Sequence not found')
        router.push('/dashboard/sequences')
        return
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch sequence')
      }

      const data = await response.json()
      setSequence(data.sequence)
    } catch (error) {
      console.error('Error loading sequence:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load sequence')
      router.push('/dashboard/sequences')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!sequence) return

    const confirmMessage = sequence.enrollments?.length > 0
      ? `Are you sure you want to delete "${sequence.name}"? This sequence has ${sequence.enrollments.length} enrollment(s). This action cannot be undone.`
      : `Are you sure you want to delete "${sequence.name}"? This action cannot be undone.`

    if (!confirm(confirmMessage)) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/sequences/${sequence.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete sequence')
      }

      toast.success('Sequence deleted successfully')
      router.push('/dashboard/sequences')
    } catch (error) {
      console.error('Error deleting sequence:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete sequence')
    } finally {
      setIsDeleting(false)
    }
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
            <h1 className="text-3xl font-bold text-gray-900">Edit Sequence</h1>
            <p className="mt-2 text-gray-600">
              Modify your email sequence workflow
            </p>
          </div>
          
          <div className="flex gap-3">
            <Link
              href={`/dashboard/sequences/${sequence.id}`}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              View Details
            </Link>
            
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Sequence
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Warning for active sequences */}
      {sequence.status === 'ACTIVE' && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex">
            <svg className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Active Sequence</h3>
              <p className="mt-1 text-sm text-yellow-700">
                This sequence is currently active with {sequence.enrollments?.filter((e: any) => e.status === 'ACTIVE').length || 0} active enrollments. 
                Changes will affect ongoing enrollments.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sequence Builder */}
      <SequenceBuilder 
        sequenceId={sequence.id}
        sequenceName={sequence.name}
        sequenceDescription={sequence.description || ''}
        steps={Array.isArray(sequence.steps) ? sequence.steps : []}
        trackingEnabled={sequence.trackingEnabled !== false}
        editMode={true}
      />
    </div>
  )
}