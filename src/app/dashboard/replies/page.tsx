import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getReplies, getRepliesStats } from '@/services/repliesService'
import RepliesHeader from '@/components/replies/RepliesHeader'
import RepliesList from '@/components/replies/RepliesList'
import RepliesStats from '@/components/replies/RepliesStats'

export default async function RepliesPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  // Fetch real data from database
  try {
    const [replies, stats] = await Promise.all([
      getReplies(session.user.id),
      getRepliesStats(session.user.id)
    ])

    return (
      <div className="space-y-6">
        {/* Page Header */}
        <RepliesHeader 
          totalReplies={stats.totalReplies}
          unreadReplies={stats.unreadReplies}
        />

        {/* Reply Statistics */}
        <RepliesStats stats={stats} />

        {/* Replies List */}
        <div className="bg-white rounded-lg shadow">
          <Suspense fallback={
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          }>
            <RepliesList replies={replies} />
          </Suspense>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error loading replies:', error)
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <h3 className="text-sm font-medium text-red-800">
              Error Loading Replies
            </h3>
          </div>
          <div className="mt-2 text-sm text-red-700">
            Unable to load your replies. Please refresh the page or try again later.
          </div>
        </div>
      </div>
    )
  }
}