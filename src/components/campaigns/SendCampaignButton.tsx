'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface SendCampaignButtonProps {
  campaignId: string
  status: string
  recipientCount: number
  className?: string
}

export default function SendCampaignButton({ 
  campaignId, 
  status, 
  recipientCount,
  className = "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
}: SendCampaignButtonProps) {
  const [sending, setSending] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()

  // Only allow sending for draft campaigns
  if (status !== 'DRAFT') {
    return null
  }

  const handleSendClick = () => {
    if (recipientCount === 0) {
      toast.error('Cannot send campaign with no recipients')
      return
    }
    setShowConfirm(true)
  }

  const handleConfirmSend = async () => {
    setSending(true)
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

      const result = await response.json()
      
      toast.success(`Campaign sent successfully to ${recipientCount} recipients`)
      setShowConfirm(false)
      
      // Refresh the page to show updated status
      router.refresh()
      
    } catch (error) {
      console.error('Error sending campaign:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send campaign')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        onClick={handleSendClick}
        disabled={sending || recipientCount === 0}
        className={`${className} ${
          recipientCount === 0 ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {sending ? 'Sending...' : 'Send Campaign'}
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirm Send Campaign
            </h3>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-3">
                You are about to send this campaign to <strong>{recipientCount} recipients</strong>.
              </p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="flex-shrink-0 w-5 h-5 text-yellow-600 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800 mb-1">Important:</p>
                    <ul className="text-yellow-700 space-y-1">
                      <li>• This action cannot be undone</li>
                      <li>• Emails will be sent immediately</li>
                      <li>• Make sure your content is final</li>
                      <li>• Recipients will receive the email via Gmail</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={sending}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSend}
                disabled={sending}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {sending ? 'Sending...' : `Send to ${recipientCount} Recipients`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}