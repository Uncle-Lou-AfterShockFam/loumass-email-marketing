'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'

interface Sequence {
  id: string
  name: string
  status: string
  steps: any[]
  description?: string | null
}

interface SequenceSelectorProps {
  campaignId?: string
  selectedSequenceId?: string
  onSelect: (sequenceId: string | null) => void
  disabled?: boolean
}

export default function SequenceSelector({ 
  campaignId,
  selectedSequenceId,
  onSelect,
  disabled = false
}: SequenceSelectorProps) {
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(selectedSequenceId || null)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    fetchSequences()
  }, [])

  const fetchSequences = async () => {
    try {
      const response = await fetch('/api/sequences')
      if (response.ok) {
        const data = await response.json()
        // Only show active sequences
        const activeSequences = data.sequences.filter((seq: Sequence) => 
          seq.status === 'ACTIVE' && seq.steps && seq.steps.length > 0
        )
        setSequences(activeSequences)
      } else {
        toast.error('Failed to load sequences')
      }
    } catch (error) {
      console.error('Error fetching sequences:', error)
      toast.error('Failed to load sequences')
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (sequenceId: string | null) => {
    setSelectedId(sequenceId)
    onSelect(sequenceId)
  }

  const selectedSequence = sequences.find(seq => seq.id === selectedId)

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded mb-2"></div>
          <div className="h-10 bg-gray-200 rounded mb-2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Follow-up Sequence
        </h3>
        <p className="text-sm text-gray-600">
          Automatically enroll responders into a sequence after they engage with this campaign
        </p>
      </div>

      <div className="space-y-4">
        {/* Sequence Toggle */}
        <div className="flex items-center">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={selectedId !== null}
              onChange={(e) => {
                if (!e.target.checked) {
                  handleSelect(null)
                } else if (sequences.length > 0) {
                  handleSelect(sequences[0].id)
                }
              }}
              disabled={disabled || sequences.length === 0}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-3 text-sm font-medium text-gray-700">
              Enable follow-up sequence
            </span>
          </label>
        </div>

        {/* Sequence Selection */}
        {selectedId !== null && (
          <div className="ml-7 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Sequence
              </label>
              <select
                value={selectedId}
                onChange={(e) => handleSelect(e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {sequences.map(sequence => (
                  <option key={sequence.id} value={sequence.id}>
                    {sequence.name} ({sequence.steps.length} steps)
                  </option>
                ))}
              </select>
            </div>

            {/* Sequence Preview */}
            {selectedSequence && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">
                    {selectedSequence.name}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {showPreview ? 'Hide' : 'Show'} Steps
                  </button>
                </div>

                {selectedSequence.description && (
                  <p className="text-sm text-gray-600 mb-2">
                    {selectedSequence.description}
                  </p>
                )}

                {showPreview && (
                  <div className="mt-3 space-y-2">
                    {selectedSequence.steps.map((step: any, index: number) => (
                      <div key={step.id} className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">Step {index + 1}:</span>
                        {step.type === 'email' && (
                          <>
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="text-gray-700">
                              {step.subject || 'Email'}
                            </span>
                          </>
                        )}
                        {step.type === 'delay' && (
                          <>
                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-gray-700">
                              Wait {step.delay?.days || 0}d {step.delay?.hours || 0}h
                            </span>
                          </>
                        )}
                        {step.type === 'condition' && (
                          <>
                            <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            <span className="text-gray-700">
                              If {step.condition?.type}
                            </span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Enrollment Triggers */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    Enrollment Triggers:
                  </p>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li className="flex items-center gap-2">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      When recipient opens the campaign email
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      When recipient clicks a link
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      When recipient replies to the email
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* No Sequences Message */}
        {sequences.length === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 mb-2">
              No active sequences available
            </p>
            <a
              href="/dashboard/sequences/new"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Create your first sequence →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}