'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { format } from 'date-fns'

interface ReplyModalProps {
  isOpen: boolean
  onClose: () => void
  replyData: {
    subject?: string
    fromEmail?: string
    date?: string
    messageBody?: string
    gmailMessageId?: string
    gmailThreadId?: string
    inReplyTo?: string
    references?: string
    contactName?: string
    campaignName?: string
  } | null
}

export default function ReplyModal({ isOpen, onClose, replyData }: ReplyModalProps) {
  if (!replyData) return null

  // Parse the date if it exists
  const formattedDate = replyData.date 
    ? format(new Date(replyData.date), 'MMM d, yyyy at h:mm a')
    : 'Unknown date'

  // Format the message body for display
  const formatMessageBody = (body: string | undefined) => {
    if (!body) return 'No message content available'
    
    // Split by common email separators (reply chains)
    const lines = body.split('\n')
    
    // Format each line
    return lines.map((line, idx) => {
      // Check if it's a quoted line (starts with >)
      if (line.trim().startsWith('>')) {
        return { text: line, isQuoted: true }
      }
      // Check if it's a header line (On ... wrote:)
      if (line.includes('wrote:') && (line.includes('On ') || line.includes('> On'))) {
        return { text: line, isHeader: true }
      }
      // Check if it's a separator line
      if (line.match(/^[-_]{3,}$/)) {
        return { text: line, isSeparator: true }
      }
      return { text: line, isNormal: true }
    })
  }
  
  const formattedLines = formatMessageBody(replyData.messageBody)

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl dark:shadow-2xl dark:shadow-gray-900 transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    Reply Details
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </Dialog.Title>

                <div className="mt-4 space-y-4">
                  {/* Header Information */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600">From:</span>
                      <span className="text-sm text-gray-900 dark:text-gray-100">{replyData.fromEmail}</span>
                      {replyData.contactName && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">({replyData.contactName})</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600">Subject:</span>
                      <span className="text-sm text-gray-900 dark:text-gray-100">{replyData.subject || 'No subject'}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600">Date:</span>
                      <span className="text-sm text-gray-900 dark:text-gray-100">{formattedDate}</span>
                    </div>
                    
                    {replyData.campaignName && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">Campaign:</span>
                        <span className="text-sm text-gray-900 dark:text-gray-100">{replyData.campaignName}</span>
                      </div>
                    )}
                  </div>

                  {/* Message Body */}
                  <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                    <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">Message Content</h4>
                    <div className="space-y-1 text-sm">
                      {typeof formattedLines === 'string' ? (
                        <p className="text-gray-800 whitespace-pre-wrap break-words">{formattedLines}</p>
                      ) : (
                        formattedLines.map((line, idx) => {
                          if (line.isSeparator) {
                            return <hr key={idx} className="my-2 border-gray-200 dark:border-gray-700" />
                          }
                          if (line.isHeader) {
                            return (
                              <div key={idx} className="text-xs text-gray-600 dark:text-gray-400 font-medium mt-3 mb-1">
                                {line.text}
                              </div>
                            )
                          }
                          if (line.isQuoted) {
                            return (
                              <div key={idx} className="pl-3 border-l-2 border-gray-300 dark:border-gray-600 text-gray-600 italic break-words">
                                {line.text.replace(/^>\s*/, '')}
                              </div>
                            )
                          }
                          return (
                            <div key={idx} className="text-gray-800 break-words whitespace-pre-wrap">
                              {line.text || '\u00A0'}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>

                  {/* Technical Details (collapsible) */}
                  <details className="border rounded-lg p-4">
                    <summary className="cursor-pointer text-sm font-medium text-gray-800 dark:text-gray-200">
                      Technical Details
                    </summary>
                    <div className="mt-3 space-y-2 text-xs text-gray-600">
                      {replyData.gmailMessageId && (
                        <div>
                          <span className="font-medium">Gmail Message ID:</span> {replyData.gmailMessageId}
                        </div>
                      )}
                      {replyData.gmailThreadId && (
                        <div>
                          <span className="font-medium">Gmail Thread ID:</span> {replyData.gmailThreadId}
                        </div>
                      )}
                      {replyData.inReplyTo && (
                        <div>
                          <span className="font-medium">In-Reply-To:</span> {replyData.inReplyTo}
                        </div>
                      )}
                      {replyData.references && (
                        <div className="break-all">
                          <span className="font-medium">References:</span> {replyData.references}
                        </div>
                      )}
                    </div>
                  </details>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white px-4 py-2 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    onClick={onClose}
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}