#!/usr/bin/env node

const https = require('https')

function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'debug'}`
      }
    }

    const req = https.request(options, (res) => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body)
          resolve({ status: res.statusCode, data: parsed })
        } catch (e) {
          resolve({ status: res.statusCode, data: body })
        }
      })
    })

    req.on('error', reject)

    if (data) {
      req.write(JSON.stringify(data))
    }
    req.end()
  })
}

async function debugSequenceBugs() {
  try {
    console.log('🔍 DEBUGGING SEQUENCE PROCESSING BUGS')
    console.log('=====================================')
    
    // Test with the new sequence
    const sequenceId = 'cmfc3h0zh0009la04ifdwmjzm'
    console.log('Testing sequence:', sequenceId)
    
    console.log('\n1. Creating test enrollment...')
    const enrollmentResult = await makeRequest(
      'https://loumassbeta.vercel.app/api/debug/create-enrollment',
      'POST',
      { sequenceId }
    )
    
    console.log('Enrollment result:', JSON.stringify(enrollmentResult, null, 2))
    
    if (enrollmentResult.data?.enrollmentId) {
      console.log('\n2. Processing enrollment immediately...')
      const forceTestResult = await makeRequest(
        'https://loumassbeta.vercel.app/api/debug/force-test',
        'POST',
        { enrollmentId: enrollmentResult.data.enrollmentId }
      )
      
      console.log('Force test result:', JSON.stringify(forceTestResult, null, 2))
    }
    
    console.log('\n3. Checking cron job status...')
    const cronResult = await makeRequest(
      'https://loumassbeta.vercel.app/api/cron/process-sequences',
      'POST'
    )
    
    console.log('Cron result:', JSON.stringify(cronResult, null, 2))
    
  } catch (error) {
    console.error('❌ Debug error:', error)
  }
}

debugSequenceBugs()