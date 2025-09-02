import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Resolver } from 'dns/promises'

export async function POST(
  request: Request,
  context: { params: Promise<{ domainId: string }> }
) {
  try {
    const { domainId } = await context.params
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get the tracking domain
    const trackingDomain = await prisma.trackingDomain.findUnique({
      where: {
        id: domainId,
        userId: session.user.id
      }
    })

    if (!trackingDomain) {
      return NextResponse.json(
        { error: 'Tracking domain not found' },
        { status: 404 }
      )
    }

    // For development mode, auto-verify domains
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         process.env.VERCEL_ENV === 'development' ||
                         process.env.NEXT_PUBLIC_BASE_URL?.includes('localhost')

    if (isDevelopment) {
      // Auto-verify in development mode
      await prisma.trackingDomain.update({
        where: { id: domainId },
        data: {
          verified: true,
          verifiedAt: new Date()
        }
      })

      return NextResponse.json({
        verified: true,
        message: 'Domain successfully verified (development mode)'
      })
    }

    // Production: Perform actual DNS lookup to verify CNAME record
    const resolver = new Resolver()
    const subdomain = trackingDomain.subdomain || 'track'
    const fullDomain = `${subdomain}.${trackingDomain.domain}`
    const expectedTarget = trackingDomain.cnameTarget || 'tracking.loumass.com'

    try {
      const cnameRecords = await resolver.resolveCname(fullDomain)
      
      // Check if any CNAME record points to the expected target
      const isVerified = cnameRecords.some(record => 
        record.toLowerCase() === expectedTarget.toLowerCase() ||
        record.toLowerCase() === `${expectedTarget}.`.toLowerCase()
      )

      if (isVerified) {
        // Update the tracking domain as verified
        await prisma.trackingDomain.update({
          where: { id: domainId },
          data: {
            verified: true,
            verifiedAt: new Date()
          }
        })

        return NextResponse.json({
          verified: true,
          message: 'Domain successfully verified'
        })
      } else {
        return NextResponse.json({
          verified: false,
          message: `CNAME record found but points to ${cnameRecords[0]} instead of ${expectedTarget}`,
          found: cnameRecords[0],
          expected: expectedTarget
        })
      }
    } catch (dnsError: any) {
      // DNS lookup failed - likely no CNAME record exists
      if (dnsError.code === 'ENODATA' || dnsError.code === 'ENOTFOUND') {
        return NextResponse.json({
          verified: false,
          message: `No CNAME record found for ${fullDomain}. Please add the DNS record and wait for propagation.`,
          expected: expectedTarget
        })
      }
      
      throw dnsError
    }
  } catch (error) {
    console.error('Domain verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify domain' },
      { status: 500 }
    )
  }
}