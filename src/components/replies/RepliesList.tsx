'use client'

import { useState } from 'react'

interface Contact {
  id: string
  name: string
  email: string
  avatar: string | null
}

interface Campaign {
  id: string
  name: string
  subject: string
}

interface Sequence {
  id: string
  name: string
  step: number
}

interface AssignedTo {
  id: string
  name: string
  email: string
}

interface Reply {
  id: string
  contact: Contact
  campaign: Campaign | null
  sequence: Sequence | null
  subject: string
  preview: string
  fullContent: string
  sentiment: 'positive' | 'negative' | 'neutral'
  priority: 'high' | 'medium' | 'low'
  isRead: boolean
  isStarred: boolean
  receivedAt: Date
  threadId: string
  tags: string[]
  assignedTo: AssignedTo | null
  metadata: {
    gmailMessageId: string
    originalCampaignId?: string
    originalSequenceId?: string
    trackingId: string
  }
}

interface RepliesListProps {
  replies: Reply[]
}

export default function RepliesList({ replies }: RepliesListProps) {
  const [selectedReplies, setSelectedReplies] = useState<string[]>([])
  const [expandedReply, setExpandedReply] = useState<string | null>(null)

  const getSentimentColor = (sentiment: Reply['sentiment']) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-100 text-green-800'
      case 'negative':
        return 'bg-red-100 text-red-800'
      case 'neutral':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: Reply['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - timestamp.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60))
      return diffMins < 1 ? 'Just now' : `${diffMins}m ago`
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else if (diffDays < 7) {
      return `${diffDays}d ago`
    } else {
      return timestamp.toLocaleDateString()
    }
  }

  const handleSelectReply = (replyId: string) => {
    setSelectedReplies(prev => 
      prev.includes(replyId) 
        ? prev.filter(id => id !== replyId)
        : [...prev, replyId]
    )
  }

  const handleSelectAll = () => {
    if (selectedReplies.length === replies.length) {
      setSelectedReplies([])
    } else {
      setSelectedReplies(replies.map(reply => reply.id))
    }
  }

  const toggleExpanded = (replyId: string) => {
    setExpandedReply(expandedReply === replyId ? null : replyId)
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  return (
    <div className="bg-white dark:bg-gray-800">
      {/* Bulk Actions Header */}
      {selectedReplies.length > 0 && (
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedReplies.length} selected
              </span>
              <div className="flex items-center gap-2">
                <button className="text-sm text-blue-700 hover:text-blue-900 px-2 py-1 rounded hover:bg-blue-100 transition-colors">
                  Mark as read
                </button>
                <button className="text-sm text-blue-700 hover:text-blue-900 px-2 py-1 rounded hover:bg-blue-100 transition-colors">
                  Star
                </button>
                <button className="text-sm text-blue-700 hover:text-blue-900 px-2 py-1 rounded hover:bg-blue-100 transition-colors">
                  Archive
                </button>
                <button className="text-sm text-blue-700 hover:text-blue-900 px-2 py-1 rounded hover:bg-blue-100 transition-colors">
                  Assign
                </button>
              </div>
            </div>
            <button 
              onClick={() => setSelectedReplies([])}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}

      {/* Replies List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {replies.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No replies yet</h3>
            <p className="text-gray-600 mb-6">When people reply to your campaigns and sequences, they'll appear here.</p>
            <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create First Campaign
            </button>
          </div>
        ) : (
          replies.map((reply) => (
            <div key={reply.id} className={`hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors ${!reply.isRead ? 'bg-blue-50/30' : ''}`}>
              <div className="px-6 py-4">
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <div className="flex items-center pt-1">
                    <input
                      type="checkbox"
                      checked={selectedReplies.includes(reply.id)}
                      onChange={() => handleSelectReply(reply.id)}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                  </div>

                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {reply.contact.avatar ? (
                      <img 
                        src={reply.contact.avatar} 
                        alt={reply.contact.name}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {getInitials(reply.contact.name)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Reply Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header Row */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className={`font-medium ${!reply.isRead ? 'text-gray-900 dark:text-gray-100' : 'text-gray-800 dark:text-gray-200'}`}>
                              {reply.contact.name}
                            </h4>
                            {!reply.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{reply.contact.email}</p>
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSentimentColor(reply.sentiment)}`}>
                            {reply.sentiment}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(reply.priority)}`}>
                            {reply.priority}
                          </span>
                          {reply.campaign && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Campaign
                            </span>
                          )}
                          {reply.sequence && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              Sequence
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {formatTimestamp(reply.receivedAt)}
                        </span>
                        <button
                          onClick={() => setExpandedReply(reply.isStarred ? null : reply.id)}
                          className={`p-1 rounded ${reply.isStarred ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-400'} transition-colors`}
                        >
                          <svg className="w-4 h-4" fill={reply.isStarred ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Subject */}
                    <div className="mb-2">
                      <h5 className={`text-sm ${!reply.isRead ? 'font-semibold text-gray-900 dark:text-gray-100' : 'font-medium text-gray-800 dark:text-gray-200'}`}>
                        {reply.subject}
                      </h5>
                    </div>

                    {/* Campaign/Sequence Info */}
                    {(reply.campaign || reply.sequence) && (
                      <div className="mb-2 text-xs text-gray-600 dark:text-gray-400">
                        {reply.campaign && (
                          <span>Reply to: {reply.campaign.name}</span>
                        )}
                        {reply.sequence && (
                          <span>Sequence: {reply.sequence.name} (Step {reply.sequence.step})</span>
                        )}
                      </div>
                    )}

                    {/* Preview */}
                    <div className="mb-3">
                      <p className={`text-sm ${!reply.isRead ? 'text-gray-800' : 'text-gray-600'}`}>
                        {reply.preview}
                      </p>
                    </div>

                    {/* Tags */}
                    {reply.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mb-3">
                        {reply.tags.map((tag) => (
                          <span key={tag} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => toggleExpanded(reply.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          {expandedReply === reply.id ? 'Hide' : 'View'} full message
                        </button>
                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                          Reply
                        </button>
                        <button className="text-gray-600 hover:text-gray-800 text-sm">
                          Forward
                        </button>
                      </div>

                      {reply.assignedTo && (
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          Assigned to: {reply.assignedTo.name}
                        </div>
                      )}
                    </div>

                    {/* Expanded Content */}
                    {expandedReply === reply.id && (
                      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="mb-3">
                          <h6 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Full Message</h6>
                          <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                            {reply.fullContent}
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="pt-3 border-t border-gray-300 dark:border-gray-600">
                          <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 dark:text-gray-400">
                            <div>
                              <span className="font-medium">Thread ID:</span> {reply.threadId}
                            </div>
                            <div>
                              <span className="font-medium">Gmail ID:</span> {reply.metadata.gmailMessageId}
                            </div>
                            <div>
                              <span className="font-medium">Tracking ID:</span> {reply.metadata.trackingId}
                            </div>
                            <div>
                              <span className="font-medium">Received:</span> {reply.receivedAt.toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {/* Quick Actions in Expanded View */}
                        <div className="mt-4 flex items-center gap-2">
                          <button className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                            Quick Reply
                          </button>
                          <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-sm font-medium rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors">
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                            Assign
                          </button>
                          <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-sm font-medium rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors">
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            Add Tags
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}