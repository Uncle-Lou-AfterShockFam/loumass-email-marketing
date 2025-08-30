import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import CampaignForm from '@/components/campaigns/CampaignForm'
import { prisma } from '@/lib/prisma'

export default async function NewCampaignPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  // Get contacts for recipient selection
  const contacts = await prisma.contact.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      company: true,
      tags: true
    },
    orderBy: { createdAt: 'desc' }
  })

  // Get email templates
  const templates = await prisma.emailTemplate.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      subject: true,
      content: true,
      category: true
    },
    orderBy: { createdAt: 'desc' }
  })

  // Check if user has a tracking domain
  const trackingDomain = await prisma.trackingDomain.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      domain: true,
      verified: true
    }
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create Campaign</h1>
        <p className="text-gray-600 mt-1">Design and send your email campaign</p>
      </div>

      <CampaignForm 
        contacts={contacts}
        templates={templates}
        trackingDomain={trackingDomain}
      />
    </div>
  )
}