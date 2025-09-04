'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import CampaignEditor from '@/components/campaigns/CampaignEditor'
import ContactSelector from '@/components/campaigns/ContactSelector'
import ScheduleSelector from '@/components/campaigns/ScheduleSelector'

const editCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  subject: z.string().min(1, 'Email subject is required'),
  content: z.string().min(1, 'Email content is required'),
  trackingEnabled: z.boolean(),
  contactIds: z.array(z.string()).min(1, 'At least one contact is required'),
  scheduledFor: z.string().optional(),
  trackingDomainId: z.string().optional()
})

type EditCampaignForm = z.infer<typeof editCampaignSchema>

interface Campaign {
  id: string
  name: string
  subject: string
  content: string
  status: string
  trackingEnabled: boolean
  scheduledFor?: string
  trackingDomainId?: string
  recipients: {
    contact: {
      id: string
      email: string
      firstName?: string
      lastName?: string
    }
  }[]
}

export default function EditCampaignPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const form = useForm<EditCampaignForm>({
    resolver: zodResolver(editCampaignSchema),
    defaultValues: {
      name: '',
      subject: '',
      content: '',
      trackingEnabled: true,
      contactIds: [],
      scheduledFor: '',
      trackingDomainId: ''
    }
  })

  // Load campaign data
  useEffect(() => {
    async function loadCampaign() {
      try {
        const response = await fetch(`/api/campaigns/${params.id}`)
        if (!response.ok) {
          throw new Error('Failed to load campaign')
        }
        
        const data = await response.json()
        const campaignData = data.campaign
        setCampaign(campaignData)

        // Populate form with existing data
        form.reset({
          name: campaignData.name,
          subject: campaignData.subject,
          content: campaignData.content,
          trackingEnabled: campaignData.trackingEnabled,
          contactIds: campaignData.recipients.map((r: any) => r.contact.id),
          scheduledFor: campaignData.scheduledFor || '',
          trackingDomainId: campaignData.trackingDomainId || ''
        })
      } catch (error) {
        console.error('Error loading campaign:', error)
        toast.error('Failed to load campaign')
        router.push('/dashboard/campaigns')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      loadCampaign()
    }
  }, [params.id, form, router])

  const onSubmit = async (data: EditCampaignForm) => {
    setSaving(true)
    try {
      const response = await fetch(`/api/campaigns/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update campaign')
      }

      toast.success('Campaign updated successfully')
      router.push(`/dashboard/campaigns/${params.id}`)
    } catch (error) {
      console.error('Error updating campaign:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update campaign')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/campaigns/${params.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete campaign')
      }

      toast.success('Campaign deleted successfully')
      router.push('/dashboard/campaigns')
    } catch (error) {
      console.error('Error deleting campaign:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete campaign')
    } finally {
      setDeleting(false)
    }
  }

  const handleDuplicate = async () => {
    if (!campaign) return

    try {
      const response = await fetch('/api/campaigns/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'duplicate',
          campaignIds: [campaign.id],
          options: {
            namePrefix: 'Copy of'
          }
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to duplicate campaign')
      }

      const result = await response.json()
      const newCampaignId = result.results[0]?.newCampaignId

      toast.success('Campaign duplicated successfully')
      if (newCampaignId) {
        router.push(`/dashboard/campaigns/${newCampaignId}/edit`)
      }
    } catch (error) {
      console.error('Error duplicating campaign:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to duplicate campaign')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Campaign Not Found</h2>
        <Link 
          href="/dashboard/campaigns"
          className="text-blue-600 hover:text-blue-700"
        >
          Back to Campaigns
        </Link>
      </div>
    )
  }

  // Prevent editing sent campaigns
  if (campaign.status === 'SENT' || campaign.status === 'SENDING') {
    return (
      <div className="text-center py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Cannot Edit Campaign</h2>
          <p className="text-gray-600 mb-6">
            This campaign has already been sent and cannot be edited.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href={`/dashboard/campaigns/${campaign.id}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              View Campaign
            </Link>
            <button
              onClick={handleDuplicate}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Duplicate Campaign
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <Link 
              href={`/dashboard/campaigns/${campaign.id}`}
              className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Campaign
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Edit Campaign</h1>
            <p className="text-gray-600 mt-1">{campaign.name}</p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleDuplicate}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Duplicate
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Campaign Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Name
              </label>
              <input
                type="text"
                id="name"
                {...form.register('name')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                placeholder="Enter campaign name"
              />
              {form.formState.errors.name && (
                <p className="text-red-600 text-sm mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                Email Subject
              </label>
              <input
                type="text"
                id="subject"
                {...form.register('subject')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                placeholder="Enter email subject"
              />
              {form.formState.errors.subject && (
                <p className="text-red-600 text-sm mt-1">{form.formState.errors.subject.message}</p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="trackingEnabled"
                {...form.register('trackingEnabled')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="trackingEnabled" className="ml-2 block text-sm text-gray-700">
                Enable open and click tracking
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Track when recipients open emails and click links
            </p>
          </div>
        </div>

        {/* Email Content */}
        <CampaignEditor
          content={form.watch('content')}
          onChange={(content) => form.setValue('content', content)}
          error={form.formState.errors.content?.message}
        />

        {/* Contact Selection */}
        <ContactSelector
          selectedContactIds={form.watch('contactIds')}
          onChange={(contactIds) => form.setValue('contactIds', contactIds)}
          error={form.formState.errors.contactIds?.message}
        />

        {/* Schedule Settings */}
        <ScheduleSelector
          scheduledFor={form.watch('scheduledFor')}
          onChange={(scheduledFor) => form.setValue('scheduledFor', scheduledFor)}
        />

        {/* Actions */}
        <div className="flex justify-between items-center pt-6 border-t">
          <Link
            href={`/dashboard/campaigns/${campaign.id}`}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </Link>
          
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}