'use client'

import { useState, useEffect } from 'react'
import { Plus, Users, Layers, MoreVertical, Edit, Trash2, Upload, Download } from 'lucide-react'
import Link from 'next/link'

interface EmailList {
  id: string
  name: string
  description: string | null
  subscriberCount: number
  activeCount: number
  createdAt: string
  _count: {
    contacts: number
    segments: number
  }
}

export default function ListsPage() {
  const [lists, setLists] = useState<EmailList[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewListModal, setShowNewListModal] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListDescription, setNewListDescription] = useState('')

  useEffect(() => {
    fetchLists()
  }, [])

  const fetchLists = async () => {
    try {
      const res = await fetch('/api/lists')
      if (res.ok) {
        const data = await res.json()
        // Ensure data is an array
        if (Array.isArray(data)) {
          setLists(data)
        } else {
          console.error('Lists API returned non-array:', data)
          setLists([])
        }
      } else {
        console.error('Lists API error:', res.status)
        setLists([])
      }
    } catch (error) {
      console.error('Error fetching lists:', error)
      setLists([])
    } finally {
      setLoading(false)
    }
  }

  const createList = async () => {
    if (!newListName.trim()) return

    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newListName,
          description: newListDescription
        })
      })

      if (res.ok) {
        await fetchLists()
        setShowNewListModal(false)
        setNewListName('')
        setNewListDescription('')
      }
    } catch (error) {
      console.error('Error creating list:', error)
    }
  }

  const deleteList = async (id: string) => {
    if (!confirm('Are you sure you want to delete this list?')) return

    try {
      const res = await fetch(`/api/lists/${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        await fetchLists()
      }
    } catch (error) {
      console.error('Error deleting list:', error)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading lists...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Email Lists</h1>
          <p className="text-gray-600 mt-2">Organize your contacts into targeted lists</p>
        </div>
        <button
          onClick={() => setShowNewListModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create List
        </button>
      </div>

      {lists.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No lists yet</h3>
          <p className="text-gray-500 mb-6">Create your first list to start organizing contacts</p>
          <button
            onClick={() => setShowNewListModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Your First List
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lists.map((list) => (
            <div key={list.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <Link
                      href={`/dashboard/lists/${list.id}`}
                      className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      {list.name}
                    </Link>
                    {list.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{list.description}</p>
                    )}
                  </div>
                  <div className="relative group">
                    <button className="p-1 rounded-lg hover:bg-gray-100">
                      <MoreVertical className="w-5 h-5 text-gray-400" />
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      <Link
                        href={`/dashboard/lists/${list.id}`}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Edit className="w-4 h-4" />
                        Edit List
                      </Link>
                      <button
                        onClick={() => deleteList(list.id)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete List
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="text-lg font-semibold text-gray-900">{list._count.contacts}</div>
                      <div className="text-xs text-gray-500">Contacts</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="text-lg font-semibold text-gray-900">{list._count.segments}</div>
                      <div className="text-xs text-gray-500">Segments</div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-500">Created {formatDate(list.createdAt)}</span>
                  <div className="flex gap-2">
                    <button className="p-1 rounded hover:bg-gray-100" title="Import contacts">
                      <Upload className="w-4 h-4 text-gray-400" />
                    </button>
                    <button className="p-1 rounded hover:bg-gray-100" title="Export list">
                      <Download className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New List Modal */}
      {showNewListModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New List</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                List Name
              </label>
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Newsletter Subscribers"
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Describe this list..."
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowNewListModal(false)
                  setNewListName('')
                  setNewListDescription('')
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createList}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                disabled={!newListName.trim()}
              >
                Create List
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}