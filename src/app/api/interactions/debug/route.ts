import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    console.log('Debug: Starting diagnostic request')
    
    // Test 1: Basic response
    console.log('Debug: Test 1 - Basic response OK')
    
    // Test 2: Session check
    const session = await getServerSession(authOptions)
    console.log('Debug: Test 2 - Session check:', { hasSession: !!session, email: session?.user?.email })
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        debug: 'Session or email missing'
      }, { status: 401 })
    }

    // Test 3: Database connection
    console.log('Debug: Test 3 - Testing database connection')
    const dbTest = await prisma.$queryRaw`SELECT 1 as test`
    console.log('Debug: Database connection OK:', dbTest)

    // Test 4: User lookup
    console.log('Debug: Test 4 - User lookup')
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    console.log('Debug: User found:', { id: user?.id, email: user?.email })

    if (!user) {
      return NextResponse.json({ 
        error: 'User not found',
        debug: `User with email ${session.user.email} not found`
      }, { status: 404 })
    }

    // Test 5: Simple EmailEvent count
    console.log('Debug: Test 5 - EmailEvent count')
    const eventCount = await prisma.emailEvent.count({
      where: { userId: user.id }
    })
    console.log('Debug: EmailEvent count:', eventCount)

    // Test 6: Sample EmailEvent query
    console.log('Debug: Test 6 - Sample EmailEvent query')
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

    // Test 7: GroupBy query (the problematic one)
    console.log('Debug: Test 7 - Testing groupBy query')
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
        session: !!session,
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