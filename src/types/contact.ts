// Prisma-compatible Contact type
export interface Contact {
  id: string
  userId: string
  email: string
  firstName: string | null
  lastName: string | null
  company: string | null
  phone: string | null
  variables: Record<string, any> | null
  tags: string[]
  unsubscribed: boolean
  bounced: boolean
  createdAt: Date
  updatedAt: Date
}

// Extended contact for UI display with computed fields
// CRITICAL: This is the interface expected by ContactsList component
// The API must return this interface to prevent displayName.split() errors
export interface ContactWithStats extends Contact {
  // Computed stats for display
  totalCampaigns: number
  totalOpened: number
  totalClicked: number
  totalReplied: number
  lastEngagement: Date | null
  engagementRate: number
  status: ContactStatus // Computed from unsubscribed/bounced
  displayName: string // REQUIRED: Computed from firstName/lastName - prevents runtime errors
}

// UI-friendly contact status
export type ContactStatus = 'SUBSCRIBED' | 'UNSUBSCRIBED' | 'BOUNCED'

// Contact filters for UI
export interface ContactFilters {
  search?: string
  status?: ContactStatus | 'all'
  tags?: string[]
  company?: string
  dateRange?: {
    start: Date
    end: Date
  }
}

// Contact tag interface
export interface ContactTag {
  id: string
  name: string
  count: number
}

// Contact stats interface
export interface ContactStats {
  totalContacts: number
  subscribedContacts: number
  unsubscribedContacts: number
  bouncedContacts: number
  subscribedRate: number
  recentlyAdded: number
  engagedContacts: number
  engagementRate: number
}

// Helper function to compute contact status
export function getContactStatus(contact: Contact): ContactStatus {
  if (contact.bounced) return 'BOUNCED'
  if (contact.unsubscribed) return 'UNSUBSCRIBED'
  return 'SUBSCRIBED'
}

// Helper function to get display name
export function getContactDisplayName(contact: Contact): string {
  const firstName = contact.firstName || ''
  const lastName = contact.lastName || ''
  const fullName = `${firstName} ${lastName}`.trim()
  return fullName || contact.email
}

// Helper function to create ContactWithStats from Contact
// CRITICAL: This function is used in API endpoints to transform raw Contact data
// Always use this function to ensure displayName is properly computed and prevent runtime errors
export function createContactWithStats(
  contact: Contact,
  stats: {
    totalCampaigns: number
    totalOpened: number
    totalClicked: number
    totalReplied: number
    lastEngagement: Date | null
  }
): ContactWithStats {
  const engagementRate = stats.totalCampaigns > 0 
    ? ((stats.totalOpened + stats.totalClicked + stats.totalReplied) / (stats.totalCampaigns * 3)) * 100 
    : 0

  return {
    ...contact,
    ...stats,
    status: getContactStatus(contact),
    displayName: getContactDisplayName(contact), // ENSURES displayName exists to prevent .split() errors
    engagementRate: Math.round(engagementRate * 10) / 10 // Round to 1 decimal
  }
}