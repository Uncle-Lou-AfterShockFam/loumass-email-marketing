'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface Campaign {
  id: string
  name: string
  subject: string
  status: string
  sentAt: Date | null
  scheduledFor: Date | null
  recipients: number
  opened: number
  clicked: number
  replied: number
  openRate: number
  clickRate: number
  trackingEnabled: boolean
  createdAt: Date
}

interface CampaignsTableProps {
  campaigns: Campaign[]
}

export default function CampaignsTable({ campaigns }: CampaignsTableProps) {
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const toggleSelection = (id: string) => {
    setSelectedCampaigns(prev =>
      prev.includes(id) 
        ? prev.filter(c => c !== id)
        : [...prev, id]
    )
  }

  const toggleAll = () => {
    setSelectedCampaigns(prev =>
      prev.length === campaigns.length
        ? []
        : campaigns.map(c => c.id)
    )
  }

  const handleBulkDelete = async () => {
    if (selectedCampaigns.length === 0) return
    
    if (!confirm(`Are you sure you want to delete ${selectedCampaigns.length} campaign(s)? This action cannot be undone.`)) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/campaigns/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          campaignIds: selectedCampaigns,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete campaigns')
      }

      toast.success(`Successfully deleted ${selectedCampaigns.length} campaign(s)`)
      setSelectedCampaigns([])
      router.refresh()
    } catch (error) {
      console.error('Error deleting campaigns:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete campaigns')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBulkExport = async () => {
    if (selectedCampaigns.length === 0) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/campaigns/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'export',
          campaignIds: selectedCampaigns,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to export campaigns')
      }

      const result = await response.json()
      
      // Create and download CSV file
      const csvContent = result.csvData
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `campaigns_export_${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }

      toast.success(`Successfully exported ${selectedCampaigns.length} campaign(s)`)
      setSelectedCampaigns([])
    } catch (error) {
      console.error('Error exporting campaigns:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to export campaigns')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendCampaign = async (campaignId: string, campaignName: string) => {
    if (!confirm(`Are you sure you want to send "${campaignName}"? This action cannot be undone.`)) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send campaign')
      }

      toast.success(`Campaign "${campaignName}" sent successfully`)
      router.refresh()
    } catch (error) {
      console.error('Error sending campaign:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send campaign')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelScheduled = async (campaignId: string, campaignName: string) => {
    if (!confirm(`Are you sure you want to cancel the scheduled campaign "${campaignName}"?`)) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'DRAFT',
          scheduledFor: null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to cancel campaign')
      }

      toast.success(`Campaign "${campaignName}" has been cancelled and returned to draft`)
      router.refresh()
    } catch (error) {
      console.error('Error cancelling campaign:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to cancel campaign')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteCampaign = async (campaignId: string, campaignName: string) => {
    if (!confirm(`Are you sure you want to delete "${campaignName}"? This action cannot be undone.`)) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete campaign')
      }

      toast.success(`Campaign "${campaignName}" deleted successfully`)
      router.refresh()
    } catch (error) {
      console.error('Error deleting campaign:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete campaign')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
      case 'DRAFT':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
      case 'SCHEDULED':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
      case 'SENDING':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
      case 'FAILED':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
    }
  }

  if (campaigns.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-8 text-center">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No campaigns</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Get started by creating a new campaign.</p>
        <div className="mt-6">
          <Link
            href="/dashboard/campaigns/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Campaign
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg overflow-hidden">
      {selectedCampaigns.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-800 dark:text-gray-200">
              {selectedCampaigns.length} selected
            </span>
            <div className="flex gap-2">
              <button 
                onClick={handleBulkDelete}
                disabled={isLoading}
                className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Deleting...' : 'Delete Selected'}
              </button>
              <button 
                onClick={handleBulkExport}
                disabled={isLoading}
                className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Exporting...' : 'Export Selected'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedCampaigns.length === campaigns.length && campaigns.length > 0}
                  onChange={toggleAll}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Campaign
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Recipients
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Open Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Click Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Tracking
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {campaigns.map((campaign) => (
              <tr key={campaign.id} className="hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedCampaigns.includes(campaign.id)}
                    onChange={() => toggleSelection(campaign.id)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {campaign.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {campaign.subject}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(campaign.status)}`}>
                    {campaign.status}
                  </span>
                  {campaign.scheduledFor && campaign.status === 'SCHEDULED' && (
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {new Date(campaign.scheduledFor).toLocaleDateString()}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  <div className="flex flex-col">
                    <span>{campaign.recipients}</span>
                    {campaign.recipients > 0 && (
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {campaign.opened} opened
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {campaign.recipients > 0 ? (
                    <div className="flex items-center">
                      <span className="font-medium">{campaign.openRate}%</span>
                      <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${campaign.openRate}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {campaign.recipients > 0 ? (
                    <div className="flex items-center">
                      <span className="font-medium">{campaign.clickRate}%</span>
                      <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${campaign.clickRate}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {campaign.trackingEnabled ? (
                      <>
                        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-600">On</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-600">Off</span>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                  {formatDistanceToNow(new Date(campaign.createdAt), { addSuffix: true })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/dashboard/campaigns/${campaign.id}`}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      View
                    </Link>
                    {campaign.status === 'DRAFT' && (
                      <>
                        <Link
                          href={`/dashboard/campaigns/${campaign.id}/edit`}
                          className="text-gray-600 hover:text-gray-800 dark:text-gray-200"
                        >
                          Edit
                        </Link>
                        <button 
                          onClick={() => handleSendCampaign(campaign.id, campaign.name)}
                          disabled={isLoading}
                          className="text-green-600 hover:text-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? 'Sending...' : 'Send'}
                        </button>
                      </>
                    )}
                    {campaign.status === 'SCHEDULED' && (
                      <button 
                        onClick={() => handleCancelScheduled(campaign.id, campaign.name)}
                        disabled={isLoading}
                        className="text-yellow-600 hover:text-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? 'Cancelling...' : 'Cancel'}
                      </button>
                    )}
                    <button 
                      onClick={() => handleDeleteCampaign(campaign.id, campaign.name)}
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {campaigns.length > 10 && (
        <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-800 dark:text-gray-200 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700">
              Previous
            </button>
            <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-800 dark:text-gray-200 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700">
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-800 dark:text-gray-200">
                Showing <span className="font-medium">1</span> to <span className="font-medium">{Math.min(10, campaigns.length)}</span> of{' '}
                <span className="font-medium">{campaigns.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700">
                  1
                </button>
                <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}