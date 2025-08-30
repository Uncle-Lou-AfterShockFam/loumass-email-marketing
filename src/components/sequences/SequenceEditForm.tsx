'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'react-hot-toast'
import SequenceBuilder from './SequenceBuilder'

const sequenceEditSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().optional(),
  trackingEnabled: z.boolean(),
  steps: z.array(z.any()),
})

type SequenceEditForm = z.infer<typeof sequenceEditSchema>

interface SequenceEditFormProps {
  sequence: {
    id: string
    name: string
    description?: string | null
    status: string
    trackingEnabled?: boolean
    steps: any
  }
}

export default function SequenceEditForm({ sequence }: SequenceEditFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [steps, setSteps] = useState(sequence.steps || [])

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<SequenceEditForm>({
    resolver: zodResolver(sequenceEditSchema),
    defaultValues: {
      name: sequence.name,
      description: sequence.description || '',
      trackingEnabled: sequence.trackingEnabled || true,
      steps: sequence.steps || []
    }
  })

  const watchedSteps = watch('steps')

  const onSubmit = async (data: SequenceEditForm) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/sequences/${sequence.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          steps
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update sequence')
      }

      toast.success('Sequence updated successfully')
      router.push(`/dashboard/sequences/${sequence.id}`)
      router.refresh()
    } catch (error) {
      console.error('Error updating sequence:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update sequence')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsLoading(true)
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
      router.refresh()
    } catch (error) {
      console.error('Error deleting sequence:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete sequence')
    } finally {
      setIsLoading(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleDuplicate = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/sequences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `Copy of ${sequence.name}`,
          description: sequence.description,
          trackingEnabled: sequence.trackingEnabled || true,
          steps
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to duplicate sequence')
      }

      const result = await response.json()
      toast.success('Sequence duplicated successfully')
      router.push(`/dashboard/sequences/${result.sequence.id}/edit`)
      router.refresh()
    } catch (error) {
      console.error('Error duplicating sequence:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to duplicate sequence')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStepsChange = (newSteps: any[]) => {
    setSteps(newSteps)
    setValue('steps', newSteps)
  }

  return (
    <div className="space-y-8">
      {/* Basic Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Basic Settings</h2>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Sequence Name
              </label>
              <input
                type="text"
                id="name"
                {...register('name')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter sequence name"
              />
              {errors.name && (
                <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div className="flex items-center">
              <label htmlFor="trackingEnabled" className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="trackingEnabled"
                  {...register('trackingEnabled')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-sm font-medium text-gray-700">
                  Enable tracking (opens, clicks, replies)
                </span>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              id="description"
              rows={3}
              {...register('description')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe this sequence..."
            />
          </div>
        </form>
      </div>

      {/* Sequence Builder */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Sequence Steps</h2>
          <span className="text-sm text-gray-500">
            {steps.length} step{steps.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        <SequenceBuilder
          steps={steps}
          onChange={handleStepsChange}
          trackingEnabled={watch('trackingEnabled')}
        />
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleDuplicate}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Duplicating...' : 'Duplicate Sequence'}
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isLoading}
              className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete Sequence
            </button>
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push(`/dashboard/sequences/${sequence.id}`)}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit(onSubmit)}
              disabled={isLoading || steps.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
        
        {steps.length === 0 && (
          <p className="text-red-600 text-sm mt-2">
            Sequence must have at least one step
          </p>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delete Sequence
            </h3>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-3">
                Are you sure you want to delete <strong>"{sequence.name}"</strong>?
              </p>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="flex-shrink-0 w-5 h-5 text-red-600 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm">
                    <p className="font-medium text-red-800 mb-1">This action cannot be undone:</p>
                    <ul className="text-red-700 space-y-1">
                      <li>• All sequence steps will be permanently deleted</li>
                      <li>• Active enrollments will be cancelled</li>
                      <li>• All sequence analytics will be lost</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {isLoading ? 'Deleting...' : 'Delete Sequence'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}