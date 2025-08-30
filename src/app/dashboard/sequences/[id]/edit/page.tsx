import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import SequenceEditForm from '@/components/sequences/SequenceEditForm'

interface SequenceEditPageProps {
  params: {
    id: string
  }
}

export default async function SequenceEditPage({ params }: SequenceEditPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const { id } = await params

  const sequence = await prisma.sequence.findUnique({
    where: {
      id,
      userId: session.user.id
    }
  })

  if (!sequence) {
    notFound()
  }

  // Don't allow editing active sequences - only draft and paused
  if (sequence.status === 'ACTIVE') {
    redirect(`/dashboard/sequences/${sequence.id}`)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link 
          href={`/dashboard/sequences/${sequence.id}`}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Sequence
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Edit Sequence</h1>
        <div className="flex items-center gap-4 mt-2">
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
            sequence.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800' :
            sequence.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {sequence.status}
          </span>
          <span className="text-sm text-gray-500">
            {sequence.name}
          </span>
        </div>
      </div>

      {/* Edit Form */}
      <SequenceEditForm sequence={sequence} />
    </div>
  )
}