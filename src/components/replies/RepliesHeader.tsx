'use client'

import { useState } from 'react'

interface RepliesHeaderProps {
  totalReplies: number
  unreadReplies: number
}

export default function RepliesHeader({ totalReplies, unreadReplies }: RepliesHeaderProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unread' | 'starred' | 'assigned'>('all')
  const [selectedSentiment, setSelectedSentiment] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all')
  const [selectedPriority, setSelectedPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all')

  const filters = [
    { key: 'all', label: 'All Replies', count: totalReplies },
    { key: 'unread', label: 'Unread', count: unreadReplies },
    { key: 'starred', label: 'Starred', count: 124 },
    { key: 'assigned', label: 'Assigned to Me', count: 89 }
  ]

  const sentimentFilters = [
    { key: 'all', label: 'All Sentiments', color: 'gray' },
    { key: 'positive', label: 'Positive', color: 'green' },
    { key: 'negative', label: 'Negative', color: 'red' },
    { key: 'neutral', label: 'Neutral', color: 'blue' }
  ]

  const priorityFilters = [
    { key: 'all', label: 'All Priorities', color: 'gray' },
    { key: 'high', label: 'High', color: 'red' },
    { key: 'medium', label: 'Medium', color: 'yellow' },
    { key: 'low', label: 'Low', color: 'green' }
  ]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Email Replies</h1>
            <p className="text-sm text-gray-600 mt-1">
              Unified inbox for all campaign and sequence replies
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Quick Actions */}
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-800 dark:text-gray-200 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
            
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-800 dark:text-gray-200 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </button>

            <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="px-6 py-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search replies by contact, subject, or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setSelectedFilter(filter.key as typeof selectedFilter)}
              className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                selectedFilter === filter.key
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-gray-100 text-gray-800 dark:text-gray-200 hover:bg-gray-200 border border-transparent'
              }`}
            >
              {filter.label}
              <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                selectedFilter === filter.key
                  ? 'bg-blue-200 text-blue-800'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {filter.count.toLocaleString()}
              </span>
            </button>
          ))}
        </div>

        {/* Advanced Filters */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Sentiment Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-800 dark:text-gray-200">Sentiment:</label>
            <select
              value={selectedSentiment}
              onChange={(e) => setSelectedSentiment(e.target.value as typeof selectedSentiment)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {sentimentFilters.map((sentiment) => (
                <option key={sentiment.key} value={sentiment.key}>
                  {sentiment.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-800 dark:text-gray-200">Priority:</label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value as typeof selectedPriority)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {priorityFilters.map((priority) => (
                <option key={priority.key} value={priority.key}>
                  {priority.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-800 dark:text-gray-200">Date:</label>
            <select className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Sort Order */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-800 dark:text-gray-200">Sort:</label>
            <select className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="priority">By Priority</option>
              <option value="sentiment">By Sentiment</option>
              <option value="unread">Unread First</option>
            </select>
          </div>

          {/* Clear Filters */}
          <button
            onClick={() => {
              setSearchTerm('')
              setSelectedFilter('all')
              setSelectedSentiment('all')
              setSelectedPriority('all')
            }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear all filters
          </button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center">
              <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500" />
              <span className="ml-2 text-sm text-gray-800 dark:text-gray-200">Select all</span>
            </label>
            
            <div className="flex items-center gap-2">
              <button className="text-sm text-gray-800 dark:text-gray-200 hover:text-gray-900 dark:text-gray-100 px-2 py-1 rounded hover:bg-gray-200 transition-colors">
                Mark as read
              </button>
              <button className="text-sm text-gray-800 dark:text-gray-200 hover:text-gray-900 dark:text-gray-100 px-2 py-1 rounded hover:bg-gray-200 transition-colors">
                Archive
              </button>
              <button className="text-sm text-gray-800 dark:text-gray-200 hover:text-gray-900 dark:text-gray-100 px-2 py-1 rounded hover:bg-gray-200 transition-colors">
                Assign to
              </button>
              <button className="text-sm text-gray-800 dark:text-gray-200 hover:text-gray-900 dark:text-gray-100 px-2 py-1 rounded hover:bg-gray-200 transition-colors">
                Add tags
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            Showing {totalReplies.toLocaleString()} replies
          </div>
        </div>
      </div>
    </div>
  )
}