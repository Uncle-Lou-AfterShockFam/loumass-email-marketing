'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Users, Upload, Download, UserPlus, Filter, Settings, Mail } from 'lucide-react'
import Link from 'next/link'

interface Contact {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  company: string | null
  status: string
}

interface ContactListEntry {
  id: string
  customData: any
  status: string
  subscribedAt: string
  contact: Contact
}

interface EmailList {
  id: string
  name: string
  description: string | null
  customFields: any
  subscriberCount: number
  activeCount: number
  contacts: ContactListEntry[]
  segments: any[]
}

export default function ListDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [list, setList] = useState<EmailList | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [showAddContactsModal, setShowAddContactsModal] = useState(false)
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (params.id) {
      fetchList()
      fetchAvailableContacts()
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
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableContacts = async () => {
    try {
      const res = await fetch('/api/contacts')
      if (res.ok) {
        const data = await res.json()
        setAvailableContacts(data)
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
    }
  }

  const addContactsToList = async () => {
    if (selectedContacts.length === 0) return

    try {
      const res = await fetch(`/api/lists/${params.id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactIds: selectedContacts
        })
      })

      if (res.ok) {
        await fetchList()
        setShowAddContactsModal(false)
        setSelectedContacts([])
      }
    } catch (error) {
      console.error('Error adding contacts:', error)
    }
  }

  const removeContactsFromList = async (contactIds: string[]) => {
    try {
      const res = await fetch(`/api/lists/${params.id}/contacts`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds })
      })

      if (res.ok) {
        await fetchList()
      }
    } catch (error) {
      console.error('Error removing contacts:', error)
    }
  }

  const exportList = () => {
    if (!list) return
    
    const csv = [
      'Email,First Name,Last Name,Company,Status',
      ...list.contacts.map(c => 
        `${c.contact.email},${c.contact.firstName || ''},${c.contact.lastName || ''},${c.contact.company || ''},${c.status}`
      )
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${list.name.replace(/\s+/g, '_')}_contacts.csv`
    a.click()
  }

  const filteredContacts = availableContacts.filter(contact => {
    const inList = list?.contacts.some(c => c.contact.id === contact.id)
    if (inList) return false
    
    const search = searchTerm.toLowerCase()
    return (
      contact.email.toLowerCase().includes(search) ||
      contact.firstName?.toLowerCase().includes(search) ||
      contact.lastName?.toLowerCase().includes(search) ||
      contact.company?.toLowerCase().includes(search)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading list...</div>
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
          href="/dashboard/lists"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Lists
        </Link>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{list.name}</h1>
            {list.description && (
              <p className="text-gray-600 mt-2">{list.description}</p>
            )}
            <div className="flex items-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-400" />
                <span className="text-sm">
                  <strong className="text-gray-900">{list.contacts.length}</strong> contacts
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <span className="text-sm">
                  <strong className="text-gray-900">{list.segments.length}</strong> segments
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddContactsModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <UserPlus className="w-5 h-5" />
              Add Contacts
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Upload className="w-5 h-5" />
              Import CSV
            </button>
            <button
              onClick={exportList}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-5 h-5" />
              Export
            </button>
            <Link
              href={`/dashboard/lists/${list.id}/segments`}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Settings className="w-5 h-5" />
              Manage Segments
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subscribed
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {list.contacts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-lg font-medium mb-1">No contacts yet</p>
                    <p className="text-sm">Add contacts to this list to get started</p>
                  </td>
                </tr>
              ) : (
                list.contacts.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {entry.contact.firstName || entry.contact.lastName
                            ? `${entry.contact.firstName || ''} ${entry.contact.lastName || ''}`
                            : 'No name'}
                        </div>
                        <div className="text-sm text-gray-500">{entry.contact.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {entry.contact.company || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        entry.status === 'active' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(entry.subscribedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="text-blue-600 hover:text-blue-800">
                          <Mail className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeContactsFromList([entry.contact.id])}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Contacts Modal */}
      {showAddContactsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
            <h2 className="text-xl font-bold mb-4">Add Contacts to List</h2>
            
            <div className="mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search contacts..."
              />
            </div>

            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg mb-4">
              <div className="divide-y divide-gray-200">
                {filteredContacts.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No contacts available to add
                  </div>
                ) : (
                  filteredContacts.map((contact) => (
                    <label
                      key={contact.id}
                      className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedContacts.includes(contact.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedContacts([...selectedContacts, contact.id])
                          } else {
                            setSelectedContacts(selectedContacts.filter(id => id !== contact.id))
                          }
                        }}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {contact.firstName || contact.lastName
                            ? `${contact.firstName || ''} ${contact.lastName || ''}`
                            : contact.email}
                        </div>
                        <div className="text-xs text-gray-500">{contact.email}</div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-between">
              <div className="text-sm text-gray-500">
                {selectedContacts.length} contacts selected
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddContactsModal(false)
                    setSelectedContacts([])
                    setSearchTerm('')
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={addContactsToList}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled={selectedContacts.length === 0}
                >
                  Add {selectedContacts.length} Contact{selectedContacts.length !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}