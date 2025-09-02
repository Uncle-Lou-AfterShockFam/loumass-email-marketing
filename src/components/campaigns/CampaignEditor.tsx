'use client'

import { useState, useRef } from 'react'

interface CampaignEditorProps {
  content: string
  onChange: (content: string) => void
  error?: string
}

export default function CampaignEditor({ content, onChange, error }: CampaignEditorProps) {
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleInsertVariable = (variable: string) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newContent = content.substring(0, start) + variable + content.substring(end)
      onChange(newContent)
      
      // Set cursor position after the inserted variable
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + variable.length
        textarea.focus()
      }, 0)
    }
  }

  const variables = [
    { label: 'First Name', value: '{{firstName}}' },
    { label: 'Last Name', value: '{{lastName}}' },
    { label: 'Full Name', value: '{{fullName}}' },
    { label: 'Email', value: '{{email}}' },
    { label: 'Company', value: '{{company}}' },
  ]

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  // Simple HTML rendering for preview (in production, use a proper HTML sanitizer)
  const renderPreview = (html: string) => {
    // Replace variables with sample data for preview
    let previewContent = html
      .replace(/\{\{firstName\}\}/g, 'John')
      .replace(/\{\{lastName\}\}/g, 'Doe')
      .replace(/\{\{fullName\}\}/g, 'John Doe')
      .replace(/\{\{email\}\}/g, 'john.doe@example.com')
      .replace(/\{\{company\}\}/g, 'ACME Corp')

    return { __html: previewContent }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Email Content</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsPreviewMode(false)}
            className={`px-3 py-1 text-sm rounded-md ${
              !isPreviewMode
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setIsPreviewMode(true)}
            className={`px-3 py-1 text-sm rounded-md ${
              isPreviewMode
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Preview
          </button>
        </div>
      </div>

      {!isPreviewMode ? (
        <div className="space-y-4">
          {/* Variables Toolbar */}
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Insert Variables:</p>
            <div className="flex flex-wrap gap-2">
              {variables.map((variable) => (
                <button
                  key={variable.value}
                  type="button"
                  onClick={() => handleInsertVariable(variable.value)}
                  className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition"
                >
                  {variable.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content Editor */}
          <div>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              rows={16}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Write your email content here... You can use HTML formatting and insert variables like {{firstName}} or {{company}}."
            />
            {error && (
              <p className="text-red-600 text-sm mt-1">{error}</p>
            )}
          </div>

          {/* Formatting Tips */}
          <div className="text-xs text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-3">
            <p><strong>Formatting Tips:</strong></p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Use HTML tags for formatting: &lt;b&gt;bold&lt;/b&gt;, &lt;i&gt;italic&lt;/i&gt;, &lt;a href="..."&gt;link&lt;/a&gt;</li>
              <li>Insert variables using double curly braces: {'{'}{'{'} firstName {'}'}{'}'}</li>
              <li>Use &lt;br&gt; for line breaks or &lt;p&gt;&lt;/p&gt; for paragraphs</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Preview with sample data (variables will be replaced with actual contact data when sent):
            </p>
            <div 
              className="prose prose-sm max-w-none bg-white dark:bg-gray-800 p-4 rounded border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
              dangerouslySetInnerHTML={renderPreview(content)}
            />
          </div>
        </div>
      )}
    </div>
  )
}