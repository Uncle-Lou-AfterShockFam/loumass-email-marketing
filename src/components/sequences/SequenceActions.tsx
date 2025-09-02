'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

interface SequenceActionsProps {
  sequence: {
    id: string
    name: string
    status: string
  }
  enrollmentCount: number
}

export default function SequenceActions({ sequence, enrollmentCount }: SequenceActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleStatusToggle = async () => {
    const newStatus = sequence.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    const action = sequence.status === 'ACTIVE' ? 'pause' : 'resume'
    
    if (!confirm(`Are you sure you want to ${action} "${sequence.name}"?`)) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/sequences/${sequence.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${action} sequence`)
      }

      toast.success(`Sequence ${action === 'pause' ? 'paused' : 'resumed'} successfully`)
      router.refresh()
    } catch (error) {
      console.error(`Error ${action}ing sequence:`, error)
      toast.error(error instanceof Error ? error.message : `Failed to ${action} sequence`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleProcessNow = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/sequences/process-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process sequences')
      }

      const result = await response.json()
      
      if (result.results && result.results.sentEmails > 0) {
        toast.success(`Processed ${result.results.processed} enrollments, sent ${result.results.sentEmails} emails`)
      } else if (result.results && result.results.processed > 0) {
        toast.success(`Processed ${result.results.processed} enrollments`)
      } else {
        toast.success('No enrollments ready to process at this time')
      }
      
      router.refresh()
    } catch (error) {
      console.error('Error processing sequences:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to process sequences')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckReplies = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/gmail/check-replies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to check for replies')
      }

      const result = await response.json()
      
      if (result.repliesFound > 0) {
        toast.success(`Found ${result.repliesFound} new replies`)
      } else {
        toast.success('No new replies found')
      }
      
      router.refresh()
    } catch (error) {
      console.error('Error checking for replies:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to check for replies')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportReport = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/sequences/${sequence.id}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to export sequence report')
      }

      const result = await response.json()
      
      // Create and download CSV file
      const csvContent = result.csvData
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `sequence_${sequence.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report_${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }

      toast.success('Sequence report exported successfully')
    } catch (error) {
      console.error('Error exporting sequence report:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to export sequence report')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex gap-3">
      <Link
        href={`/dashboard/sequences/${sequence.id}/edit`}
        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
      >
        Edit Sequence
      </Link>
      
      <button
        onClick={handleStatusToggle}
        disabled={isLoading}
        className={`px-4 py-2 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${
          sequence.status === 'ACTIVE' 
            ? 'bg-yellow-600 hover:bg-yellow-700' 
            : 'bg-green-600 hover:bg-green-700'
        }`}
      >
        {isLoading 
          ? (sequence.status === 'ACTIVE' ? 'Pausing...' : 'Resuming...') 
          : (sequence.status === 'ACTIVE' ? 'Pause Sequence' : 'Resume Sequence')
        }
      </button>

      <Link
        href={`/dashboard/sequences/${sequence.id}/enroll`}
        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
      >
        Enroll Contacts
      </Link>

      {sequence.status === 'ACTIVE' && (
        <button
          onClick={handleProcessNow}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing...' : 'Process Now'}
        </button>
      )}

      <button
        onClick={handleCheckReplies}
        disabled={isLoading}
        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Checking...' : 'Check Replies'}
      </button>
      
      <button
        onClick={handleExportReport}
        disabled={isLoading}
        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Exporting...' : 'Export Report'}
      </button>
    </div>
  )
}