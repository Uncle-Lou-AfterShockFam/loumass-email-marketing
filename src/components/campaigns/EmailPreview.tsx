'use client'

import { useState } from 'react'

interface EmailPreviewProps {
  subject: string
  content: string
  trackingEnabled?: boolean
}

export default function EmailPreview({ subject, content, trackingEnabled = true }: EmailPreviewProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')

  // Process content to display tracking info
  const processedContent = trackingEnabled 
    ? content.replace(/\{\{trackingPixel\}\}/g, '<img src="#" alt="" width="1" height="1" style="display:none" />')
    : content.replace(/\{\{trackingPixel\}\}/g, '')

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Preview Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Email Preview</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('desktop')}
              className={`px-3 py-1.5 text-sm font-medium rounded ${
                viewMode === 'desktop'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Desktop
            </button>
            <button
              onClick={() => setViewMode('mobile')}
              className={`px-3 py-1.5 text-sm font-medium rounded ${
                viewMode === 'mobile'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Mobile
            </button>
          </div>
        </div>
      </div>

      {/* Email Content */}
      <div className="p-6">
        <div className={`mx-auto bg-white rounded-lg shadow-sm border ${
          viewMode === 'desktop' ? 'max-w-2xl' : 'max-w-sm'
        }`}>
          {/* Email Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600 mb-1">Subject:</div>
            <div className="font-medium text-gray-900">{subject}</div>
          </div>

          {/* Email Body */}
          <div className="p-4">
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: processedContent }}
            />
          </div>

          {/* Tracking Info */}
          {trackingEnabled && (
            <div className="px-4 py-2 bg-blue-50 border-t border-blue-100">
              <div className="text-xs text-blue-600">
                ✓ Email tracking enabled (opens and clicks will be tracked)
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}