'use client'

import { useState, useEffect } from 'react'
import InteractionsTable from '@/components/interactions/InteractionsTable'
import InteractionsFilters from '@/components/interactions/InteractionsFilters'
import InteractionsStats from '@/components/interactions/InteractionsStats'
import { toast } from 'react-hot-toast'

export default function InteractionsPage() {
  const [interactions, setInteractions] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalSent: 0,
    totalOpened: 0,
    totalClicked: 0,
    totalReplied: 0,
    totalBounced: 0,
    totalComplained: 0
  })
  
  const [filters, setFilters] = useState({
    contactId: '',
    campaignId: '',
    sequenceId: '',
    interactionType: 'all',
    dateFrom: '',
    dateTo: '',
    search: ''
  })

  useEffect(() => {
    fetchInteractions()
  }, [filters])

  const fetchInteractions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value)
        }
      })

      const response = await fetch(`/api/interactions?${params}`)
      if (!response.ok) throw new Error('Failed to fetch interactions')
      
      const data = await response.json()
      setInteractions(data.interactions)
      setStats(data.stats)
    } catch (error) {
      console.error('Error fetching interactions:', error)
      toast.error('Failed to load interactions')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters)
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value)
        }
      })
      
      const response = await fetch(`/api/interactions/export?${params}`)
      if (!response.ok) throw new Error('Failed to export interactions')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `interactions-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('Interactions exported successfully')
    } catch (error) {
      console.error('Error exporting interactions:', error)
      toast.error('Failed to export interactions')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Email Interactions
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            View all email activity across campaigns and sequences
          </p>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Statistics Cards */}
      <InteractionsStats stats={stats} />

      {/* Filters */}
      <InteractionsFilters
        filters={filters}
        onChange={handleFilterChange}
      />

      {/* Interactions Table */}
      <InteractionsTable
        interactions={interactions}
        loading={loading}
      />
    </div>
  )
}