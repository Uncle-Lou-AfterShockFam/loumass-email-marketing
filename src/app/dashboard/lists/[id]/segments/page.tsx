'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Users, Filter, Edit, Trash2, Settings } from 'lucide-react'
import Link from 'next/link'

interface Condition {
  field: string
  operator: string
  value: string
}

interface Segment {
  id: string
  name: string
  description: string | null
  conditions: {
    match: 'all' | 'any'
    rules: Condition[]
  }
  contactCount: number
  createdAt: string
}

interface EmailList {
  id: string
  name: string
  description: string | null
}

interface Contact {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  company?: string
  tags?: string[]
}

export default function ListSegmentsPage() {
  const params = useParams()
  const router = useRouter()
  const [list, setList] = useState<EmailList | null>(null)
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewSegmentModal, setShowNewSegmentModal] = useState(false)
  const [showEditSegmentModal, setShowEditSegmentModal] = useState(false)
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null)
  const [newSegmentName, setNewSegmentName] = useState('')
  const [newSegmentDescription, setNewSegmentDescription] = useState('')
  const [conditions, setConditions] = useState<{ match: 'all' | 'any', rules: Condition[] }>({
    match: 'all',
    rules: [{ field: 'email', operator: 'contains', value: '' }]
  })
  const [showContactsModal, setShowContactsModal] = useState(false)
  const [viewingSegment, setViewingSegment] = useState<Segment | null>(null)
  const [segmentContacts, setSegmentContacts] = useState<Contact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchList()
      fetchSegments()
    }
  }, [params.id])

  const fetchList = async () => {
    try {
      const res = await fetch(`/api/lists/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setList(data)
      } else if (res.status === 404) {
        router.push('/dashboard/lists')
      }
    } catch (error) {
      console.error('Error fetching list:', error)
    }
  }

  const fetchSegments = async () => {
    try {
      const res = await fetch(`/api/lists/${params.id}/segments`)
      if (res.ok) {
        const data = await res.json()
        // Ensure data is an array
        setSegments(Array.isArray(data) ? data : [])
      } else {
        console.error('Failed to fetch segments')
        setSegments([])
      }
    } catch (error) {
      console.error('Error fetching segments:', error)
      setSegments([])
    } finally {
      setLoading(false)
    }
  }

  const createSegment = async () => {
    if (!newSegmentName.trim()) return

    try {
      const res = await fetch(`/api/lists/${params.id}/segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSegmentName,
          description: newSegmentDescription,
          conditions: conditions
        })
      })

      if (res.ok) {
        await fetchSegments()
        setShowNewSegmentModal(false)
        setNewSegmentName('')
        setNewSegmentDescription('')
        setConditions({
          match: 'all',
          rules: [{ field: 'email', operator: 'contains', value: '' }]
        })
      }
    } catch (error) {
      console.error('Error creating segment:', error)
    }
  }

  const updateSegment = async () => {
    if (!editingSegment || !newSegmentName.trim()) return

    try {
      const res = await fetch(`/api/lists/${params.id}/segments/${editingSegment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSegmentName,
          description: newSegmentDescription,
          conditions: conditions
        })
      })

      if (res.ok) {
        await fetchSegments()
        setShowEditSegmentModal(false)
        setEditingSegment(null)
        setNewSegmentName('')
        setNewSegmentDescription('')
        setConditions({
          match: 'all',
          rules: [{ field: 'email', operator: 'contains', value: '' }]
        })
      }
    } catch (error) {
      console.error('Error updating segment:', error)
    }
  }

  const openEditModal = (segment: Segment) => {
    setEditingSegment(segment)
    setNewSegmentName(segment.name)
    setNewSegmentDescription(segment.description || '')
    setConditions(segment.conditions || {
      match: 'all',
      rules: [{ field: 'email', operator: 'contains', value: '' }]
    })
    setShowEditSegmentModal(true)
  }

  const deleteSegment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this segment?')) return

    try {
      const res = await fetch(`/api/lists/${params.id}/segments/${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        await fetchSegments()
      }
    } catch (error) {
      console.error('Error deleting segment:', error)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const addCondition = () => {
    setConditions({
      ...conditions,
      rules: [...conditions.rules, { field: 'email', operator: 'contains', value: '' }]
    })
  }

  const removeCondition = (index: number) => {
    setConditions({
      ...conditions,
      rules: conditions.rules.filter((_, i) => i !== index)
    })
  }

  const updateCondition = (index: number, field: keyof Condition, value: string) => {
    const newRules = [...conditions.rules]
    newRules[index] = { ...newRules[index], [field]: value }
    setConditions({ ...conditions, rules: newRules })
  }

  const viewSegmentContacts = async (segment: Segment) => {
    setViewingSegment(segment)
    setShowContactsModal(true)
    setLoadingContacts(true)
    setSegmentContacts([])

    try {
      const res = await fetch(`/api/lists/${params.id}/segments/${segment.id}/contacts`)
      if (res.ok) {
        const contacts = await res.json()
        setSegmentContacts(Array.isArray(contacts) ? contacts : [])
      }
    } catch (error) {
      console.error('Error fetching segment contacts:', error)
    } finally {
      setLoadingContacts(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading segments...</div>
      </div>
    )
  }

  if (!list) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">List not found</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <Link
          href={`/dashboard/lists/${list.id}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {list.name}
        </Link>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Segments</h1>
            <p className="text-gray-600 mt-2">Create targeted segments within {list.name}</p>
          </div>
          
          <button
            onClick={() => setShowNewSegmentModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Create Segment
          </button>
        </div>
      </div>

      {segments.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Filter className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No segments yet</h3>
          <p className="text-gray-500 mb-6">Create your first segment to target specific groups of contacts</p>
          <button
            onClick={() => setShowNewSegmentModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Your First Segment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {segments.map((segment) => (
            <div key={segment.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {segment.name}
                    </h3>
                    {segment.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{segment.description}</p>
                    )}
                  </div>
                  <div className="relative group">
                    <button className="p-1 rounded-lg hover:bg-gray-100">
                      <Settings className="w-5 h-5 text-gray-400" />
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      <button
                        onClick={() => openEditModal(segment)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Segment
                      </button>
                      <button
                        onClick={() => deleteSegment(segment.id)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Segment
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{segment.contactCount}</div>
                    <div className="text-xs text-gray-500">Contacts</div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-500">Created {formatDate(segment.createdAt)}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => viewSegmentContacts(segment)}
                      className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                    >
                      View Contacts
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Segment Modal */}
      {showNewSegmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create New Segment</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Segment Name
              </label>
              <input
                type="text"
                value={newSegmentName}
                onChange={(e) => setNewSegmentName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Active Subscribers"
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                value={newSegmentDescription}
                onChange={(e) => setNewSegmentDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Describe this segment..."
              />
            </div>

            {/* Conditions Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Segment Conditions
              </label>
              
              <div className="mb-3">
                <span className="text-sm text-gray-600">Match </span>
                <select
                  value={conditions.match}
                  onChange={(e) => setConditions({ ...conditions, match: e.target.value as 'all' | 'any' })}
                  className="mx-1 px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="all">all</option>
                  <option value="any">any</option>
                </select>
                <span className="text-sm text-gray-600"> of the following conditions:</span>
              </div>

              <div className="space-y-2">
                {conditions.rules.map((rule, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      value={rule.field}
                      onChange={(e) => updateCondition(index, 'field', e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="email">Email</option>
                      <option value="firstName">First Name</option>
                      <option value="lastName">Last Name</option>
                      <option value="tags">Tags</option>
                      <option value="source">Source</option>
                      <option value="status">Status</option>
                      <option value="createdAt">Created Date</option>
                    </select>
                    
                    <select
                      value={rule.operator}
                      onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="contains">contains</option>
                      <option value="equals">equals</option>
                      <option value="startsWith">starts with</option>
                      <option value="endsWith">ends with</option>
                      <option value="doesNotContain">does not contain</option>
                      <option value="isEmpty">is empty</option>
                      <option value="isNotEmpty">is not empty</option>
                    </select>
                    
                    <input
                      type="text"
                      value={rule.value}
                      onChange={(e) => updateCondition(index, 'value', e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Value"
                      disabled={rule.operator === 'isEmpty' || rule.operator === 'isNotEmpty'}
                    />
                    
                    <button
                      onClick={() => removeCondition(index)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                      disabled={conditions.rules.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              
              <button
                onClick={addCondition}
                className="mt-3 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Condition
              </button>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowNewSegmentModal(false)
                  setNewSegmentName('')
                  setNewSegmentDescription('')
                  setConditions({
                    match: 'all',
                    rules: [{ field: 'email', operator: 'contains', value: '' }]
                  })
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createSegment}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                disabled={!newSegmentName.trim()}
              >
                Create Segment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Segment Modal */}
      {showEditSegmentModal && editingSegment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Edit Segment</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Segment Name
              </label>
              <input
                type="text"
                value={newSegmentName}
                onChange={(e) => setNewSegmentName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Active Subscribers"
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                value={newSegmentDescription}
                onChange={(e) => setNewSegmentDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Describe this segment..."
              />
            </div>

            {/* Conditions Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Segment Conditions
              </label>
              
              <div className="mb-3">
                <span className="text-sm text-gray-600">Match </span>
                <select
                  value={conditions.match}
                  onChange={(e) => setConditions({ ...conditions, match: e.target.value as 'all' | 'any' })}
                  className="mx-1 px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="all">all</option>
                  <option value="any">any</option>
                </select>
                <span className="text-sm text-gray-600"> of the following conditions:</span>
              </div>

              <div className="space-y-2">
                {conditions.rules.map((rule, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      value={rule.field}
                      onChange={(e) => updateCondition(index, 'field', e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="email">Email</option>
                      <option value="firstName">First Name</option>
                      <option value="lastName">Last Name</option>
                      <option value="tags">Tags</option>
                      <option value="source">Source</option>
                      <option value="status">Status</option>
                      <option value="createdAt">Created Date</option>
                    </select>
                    
                    <select
                      value={rule.operator}
                      onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="contains">contains</option>
                      <option value="equals">equals</option>
                      <option value="startsWith">starts with</option>
                      <option value="endsWith">ends with</option>
                      <option value="doesNotContain">does not contain</option>
                      <option value="isEmpty">is empty</option>
                      <option value="isNotEmpty">is not empty</option>
                    </select>
                    
                    <input
                      type="text"
                      value={rule.value}
                      onChange={(e) => updateCondition(index, 'value', e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Value"
                      disabled={rule.operator === 'isEmpty' || rule.operator === 'isNotEmpty'}
                    />
                    
                    <button
                      onClick={() => removeCondition(index)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                      disabled={conditions.rules.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              
              <button
                onClick={addCondition}
                className="mt-3 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Condition
              </button>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowEditSegmentModal(false)
                  setEditingSegment(null)
                  setNewSegmentName('')
                  setNewSegmentDescription('')
                  setConditions({
                    match: 'all',
                    rules: [{ field: 'email', operator: 'contains', value: '' }]
                  })
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={updateSegment}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                disabled={!newSegmentName.trim()}
              >
                Update Segment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Contacts Modal */}
      {showContactsModal && viewingSegment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold">Contacts in "{viewingSegment.name}"</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {segmentContacts.length} contact{segmentContacts.length !== 1 ? 's' : ''} match your conditions
                </p>
              </div>
              <button
                onClick={() => {
                  setShowContactsModal(false)
                  setViewingSegment(null)
                  setSegmentContacts([])
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {loadingContacts ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading contacts...</div>
              </div>
            ) : segmentContacts.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500">No contacts match the segment conditions</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {segmentContacts.map((contact) => (
                      <tr key={contact.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {contact.firstName} {contact.lastName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {contact.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {contact.company || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {contact.phone || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}