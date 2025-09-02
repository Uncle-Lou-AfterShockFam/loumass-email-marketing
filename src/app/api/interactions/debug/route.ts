import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    console.log('Debug: Starting diagnostic v5 - with real auth test')
    
    // Test 1: Environment check
    const dbUrl = process.env.DATABASE_URL
    const neonUrl = process.env.NEON_DATABASE_URL
    const nodeEnv = process.env.NODE_ENV
    
    console.log('Debug: Environment check:', { 
      hasDbUrl: !!dbUrl, 
      hasNeonUrl: !!neonUrl,
      nodeEnv,
      dbUrlStart: dbUrl?.substring(0, 15),
      neonUrlStart: neonUrl?.substring(0, 15)
    })

    // Test 2: Database connection
    let dbConnectionResult = 'not tested'
    try {
      console.log('Debug: Testing database connection...')
      const dbTest = await prisma.$queryRaw`SELECT 1 as test`
      console.log('Debug: Database connection OK:', dbTest)
      dbConnectionResult = 'success'
    } catch (dbError) {
      console.error('Debug: Database connection failed:', dbError)
      dbConnectionResult = dbError instanceof Error ? dbError.message : String(dbError)
    }

    // Test 3: EmailEvent model check
    let emailEventCheck = 'not tested'
    let emailEventCount = 0
    try {
      console.log('Debug: Testing EmailEvent model...')
      emailEventCount = await prisma.emailEvent.count()
      console.log('Debug: EmailEvent count:', emailEventCount)
      emailEventCheck = 'success'
    } catch (eventError) {
      console.error('Debug: EmailEvent query failed:', eventError)
      emailEventCheck = eventError instanceof Error ? eventError.message : String(eventError)
    }

    // Test 4: Authentication check
    let authResult = 'not tested'
    let userInfo = null
    try {
      console.log('Debug: Testing authentication...')
      const session = await getServerSession(authOptions)
      if (!session?.user?.email) {
        authResult = 'No session or email'
      } else {
        const user = await prisma.user.findUnique({
          where: { email: session.user.email }
        })
        if (!user) {
          authResult = 'Session exists but user not found in database'
        } else {
          authResult = 'success'
          userInfo = { id: user.id, email: user.email }
        }
      }
    } catch (authError) {
      console.error('Debug: Auth check failed:', authError)
      authResult = authError instanceof Error ? authError.message : String(authError)
    }

    // Test 5: User-specific EmailEvent query (if authenticated)
    let userEventsResult = 'not tested'
    let userEventsCount = 0
    if (authResult === 'success' && userInfo) {
      try {
        console.log('Debug: Testing user-specific EmailEvent query...')
        userEventsCount = await prisma.emailEvent.count({
          where: { userId: userInfo.id }
        })
        console.log('Debug: User has', userEventsCount, 'email events')
        userEventsResult = 'success'
      } catch (userEventsError) {
        console.error('Debug: User events query failed:', userEventsError)
        userEventsResult = userEventsError instanceof Error ? userEventsError.message : String(userEventsError)
      }
    }

    // Test 6: Complex query with joins (simplified version of interactions query)
    let complexQueryResult = 'not tested'
    let sampleEventsCount = 0
    if (authResult === 'success' && userInfo) {
      try {
        console.log('Debug: Testing complex EmailEvent query with user filter...')
        const sampleEvents = await prisma.emailEvent.findMany({
          where: { userId: userInfo.id },
          take: 5,
          include: {
            contact: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true
              }
            },
            campaign: {
              select: {
                id: true,
                name: true
              }
            },
            sequence: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            timestamp: 'desc'
          }
        })
        console.log('Debug: Complex query returned', sampleEvents.length, 'events for user')
        sampleEventsCount = sampleEvents.length
        complexQueryResult = 'success'
      } catch (complexError) {
        console.error('Debug: Complex query failed:', complexError)
        complexQueryResult = complexError instanceof Error ? complexError.message : String(complexError)
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      debug: {
        hasDbUrl: !!dbUrl,
        hasNeonUrl: !!neonUrl,
        nodeEnv,
        dbUrlStart: dbUrl?.substring(0, 15),
        neonUrlStart: neonUrl?.substring(0, 15),
        dbConnection: dbConnectionResult,
        emailEventCheck,
        emailEventCount,
        authResult,
        userInfo,
        userEventsResult,
        userEventsCount,
        complexQueryResult,
        sampleEventsCount
      }
    })

  } catch (error) {
    console.error('Debug: Minimal diagnostic error:', error)
    return NextResponse.json({
      error: 'Minimal diagnostic failed',
      debug: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'Unknown'
      }
    }, { status: 500 })
  }
}