import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    console.log('Debug: Starting diagnostic request v2 - with updated DATABASE_URL')
    
    // Test 1: Basic response
    console.log('Debug: Test 1 - Basic response OK')
    
    // Test 2: Environment check
    const dbUrl = process.env.DATABASE_URL
    const neonUrl = process.env.NEON_DATABASE_URL
    console.log('Debug: Environment check:', { 
      hasDbUrl: !!dbUrl, 
      hasNeonUrl: !!neonUrl,
      nodeEnv: process.env.NODE_ENV,
      dbUrlPrefix: dbUrl?.substring(0, 20) + '...',
      neonUrlPrefix: neonUrl?.substring(0, 20) + '...'
    })
    
    // Test 3: Database connection
    console.log('Debug: Test 3 - Testing database connection')
    try {
      const dbTest = await prisma.$queryRaw`SELECT 1 as test`
      console.log('Debug: Database connection OK:', dbTest)
    } catch (dbError) {
      console.error('Debug: Database connection failed:', dbError)
      return NextResponse.json({
        error: 'Database connection failed',
        debug: {
          message: dbError instanceof Error ? dbError.message : String(dbError),
          env: { hasDbUrl: !!dbUrl, hasNeonUrl: !!neonUrl }
        }
      }, { status: 500 })
    }

    // Test 4: Session check (temporarily skipped for debugging)
    // const session = await getServerSession(authOptions)
    // console.log('Debug: Test 4 - Session check:', { hasSession: !!session, email: session?.user?.email })
    
    // For debugging, skip user lookup and use mock user
    const user = { id: 'test-user-id', email: 'debug@test.com' }
    console.log('Debug: Test 5 - Using mock user for debugging:', { id: user.id, email: user.email })

    // Test 6: Simple EmailEvent count
    console.log('Debug: Test 6 - EmailEvent count')
    const eventCount = await prisma.emailEvent.count({
      where: { userId: user.id }
    })
    console.log('Debug: EmailEvent count:', eventCount)

    // Test 7: Sample EmailEvent query
    console.log('Debug: Test 7 - Sample EmailEvent query')
    const sampleEvents = await prisma.emailEvent.findMany({
      where: { userId: user.id },
      take: 1,
      select: {
        id: true,
        type: true,
        timestamp: true,
        subject: true
      }
    })
    console.log('Debug: Sample events:', sampleEvents)

    // Test 8: GroupBy query (the problematic one)
    console.log('Debug: Test 8 - Testing groupBy query')
    try {
      const statsWhere = {
        userId: user.id,
        type: {
          not: null
        }
      }
      console.log('Debug: statsWhere:', statsWhere)
      
      const stats = await prisma.emailEvent.groupBy({
        by: ['type'],
        where: statsWhere,
        _count: true
      })
      console.log('Debug: GroupBy stats:', stats)
    } catch (groupByError) {
      console.error('Debug: GroupBy failed:', groupByError)
      return NextResponse.json({
        error: 'GroupBy query failed',
        debug: {
          message: groupByError instanceof Error ? groupByError.message : String(groupByError),
          stack: groupByError instanceof Error ? groupByError.stack : undefined
        }
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      debug: {
        mockSession: true,
        user: { id: user.id, email: user.email },
        eventCount,
        sampleEvents: sampleEvents.length
      }
    })

  } catch (error) {
    console.error('Debug: Diagnostic error:', error)
    return NextResponse.json({
      error: 'Diagnostic failed',
      debug: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'Unknown'
      }
    }, { status: 500 })
  }
}