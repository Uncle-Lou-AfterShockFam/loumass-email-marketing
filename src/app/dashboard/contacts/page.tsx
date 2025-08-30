'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import ContactsHeader from '@/components/contacts/ContactsHeader'
import ContactsList from '@/components/contacts/ContactsList'
import ContactsStats from '@/components/contacts/ContactsStats'
import { ContactWithStats, ContactStats, ContactTag } from '@/types/contact'


export default function ContactsPage() {
  const { data: session, status } = useSession()
  const [contacts, setContacts] = useState<ContactWithStats[]>([])
  const [stats, setStats] = useState<ContactStats>({
    totalContacts: 0,
    subscribedContacts: 0,
    unsubscribedContacts: 0,
    bouncedContacts: 0,
    subscribedRate: 0,
    recentlyAdded: 0,
    engagedContacts: 0,
    engagementRate: 0
  })
  const [tags, setTags] = useState<ContactTag[]>([])
  const [loading, setLoading] = useState(true)
  
  const fetchContactsData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/contacts')
      if (response.ok) {
        const data = await response.json()
        setContacts(data.contacts || [])
        setStats(data.stats || stats)
        setTags(data.tags || [])
      } else {
        console.error('Failed to fetch contacts data')
      }
    } catch (error) {
      console.error('Error fetching contacts data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      fetchContactsData()
    } else if (status === 'unauthenticated') {
      redirect('/auth/signin')
    }
  }, [status])

  const handleContactAdded = (newContact: any) => {
    // Refresh the contacts data to show the new contact
    fetchContactsData()
  }

  if (status === 'loading' || loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="bg-white rounded-lg shadow p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2 text-center">Loading contacts...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    redirect('/auth/signin')
    return null
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-600 mt-1">
            Manage your contacts, import new ones, and track engagement
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <ContactsStats stats={stats} />

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow">
        <ContactsHeader 
          totalContacts={stats.totalContacts}
          tags={tags}
          onContactAdded={handleContactAdded}
        />
        
        <ContactsList 
          contacts={contacts}
          tags={tags}
        />
      </div>
    </div>
  )
}