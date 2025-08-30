import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getAnalytics } from '@/services/analyticsService'
import AnalyticsOverview from '@/components/analytics/AnalyticsOverview'
import AnalyticsCharts from '@/components/analytics/AnalyticsCharts'
import RecentActivity from '@/components/analytics/RecentActivity'
import PerformanceMetrics from '@/components/analytics/PerformanceMetrics'

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  // Fetch real data from database
  try {
    const analyticsData = await getAnalytics(session.user.id)

    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-1">
              Track your email performance and campaign insights
            </p>
          </div>
          
          {/* Date Range Selector */}
          <div className="flex items-center gap-3">
            <select defaultValue="30d" className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
              <option value="custom">Custom range</option>
            </select>
            
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              Export Report
            </button>
          </div>
        </div>

        {/* Analytics Overview */}
        <AnalyticsOverview data={analyticsData.overview} />

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="xl:col-span-2">
            <AnalyticsCharts 
              timeSeriesData={analyticsData.timeSeriesData}
              topCampaigns={analyticsData.topPerformingCampaigns}
            />
          </div>
        </div>

        {/* Performance Metrics vs Industry */}
        <PerformanceMetrics metrics={analyticsData.performanceMetrics} />

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          <Suspense fallback={
            <div className="bg-white rounded-lg shadow p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-3 bg-gray-200 rounded w-4/6"></div>
                </div>
              </div>
            </div>
          }>
            <RecentActivity activities={analyticsData.recentActivity} />
          </Suspense>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error loading analytics:', error)
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <h3 className="text-sm font-medium text-red-800">
              Error Loading Analytics
            </h3>
          </div>
          <div className="mt-2 text-sm text-red-700">
            Unable to load your analytics data. Please refresh the page or try again later.
          </div>
        </div>
      </div>
    )
  }
}