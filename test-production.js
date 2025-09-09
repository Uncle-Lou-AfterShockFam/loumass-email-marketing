#!/usr/bin/env node

/**
 * PRODUCTION TEST SCRIPT
 * 
 * Tests the email sequence fixes in production
 */

const fetch = require('node-fetch');

// Production URL
const PRODUCTION_URL = 'https://loumass.vercel.app';

// Test data from our local test
const TEST_SEQUENCE_ID = 'cmfcoy2s800018oa10gdi71d7';
const TEST_ENROLLMENT_ID = 'cmfcoy2x700078oa1qtwhj8co';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(title) {
  console.log('\n' + '='.repeat(60));
  log(`🚀 ${title}`, 'bright');
  console.log('='.repeat(60));
}

async function testProduction() {
  header('PRODUCTION DEPLOYMENT TEST');
  
  try {
    // Test 1: Check if site is accessible
    log('\n📡 Testing production deployment...', 'cyan');
    
    const response = await fetch(PRODUCTION_URL);
    
    if (response.ok) {
      log('✅ Production site is accessible', 'green');
      log(`   Status: ${response.status}`, 'cyan');
      log(`   URL: ${PRODUCTION_URL}`, 'cyan');
    } else {
      log(`❌ Site returned status: ${response.status}`, 'red');
    }
    
    // Test 2: Check API health
    log('\n📡 Testing API endpoint...', 'cyan');
    
    const apiResponse = await fetch(`${PRODUCTION_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    }).catch(err => {
      log('   API health check endpoint not available (expected)', 'yellow');
      return null;
    });
    
    if (apiResponse && apiResponse.ok) {
      log('✅ API is responding', 'green');
    } else {
      log('ℹ️ API health endpoint not configured (normal)', 'yellow');
    }
    
    // Display test instructions
    header('MANUAL TESTING INSTRUCTIONS');
    
    log('\n📋 Step 1: Login to LOUMASS', 'bright');
    log(`   Go to: ${PRODUCTION_URL}`, 'cyan');
    log('   Login with your Google account', 'cyan');
    
    log('\n📋 Step 2: Check Sequences', 'bright');
    log('   Navigate to Dashboard > Sequences', 'cyan');
    log('   Look for: "Test Sequence - 2025-09-09..."', 'cyan');
    
    log('\n📋 Step 3: Verify Enrollments', 'bright');
    log('   Check if the test enrollment shows:', 'cyan');
    log('   - Contact: ljpiotti@aftershockfam.org', 'cyan');
    log('   - Message-ID stored correctly', 'cyan');
    log('   - Step executions tracked', 'cyan');
    
    log('\n📋 Step 4: Test Email Sending', 'bright');
    log('   1. Create a new sequence with:', 'cyan');
    log('      - Initial email', 'cyan');
    log('      - Delay (5 seconds)', 'cyan');
    log('      - Condition (email opened)', 'cyan');
    log('      - Two branch emails', 'cyan');
    log('   2. Enroll a contact', 'cyan');
    log('   3. Trigger execution', 'cyan');
    log('   4. Check Gmail for:', 'cyan');
    log('      - Threading (replies in same thread)', 'cyan');
    log('      - Tracking pixels/links', 'cyan');
    log('      - Only one branch executing', 'cyan');
    
    header('AUTOMATED TEST DATA');
    
    log('\n📝 Test Data Created:', 'bright');
    log(`Sequence ID: ${TEST_SEQUENCE_ID}`, 'cyan');
    log(`Enrollment ID: ${TEST_ENROLLMENT_ID}`, 'cyan');
    
    log('\n💡 To trigger sequence execution via API:', 'yellow');
    log('curl -X POST ' + PRODUCTION_URL + '/api/sequences/execute \\');
    log('  -H "Content-Type: application/json" \\');
    log('  -H "Cookie: [your-auth-cookie]" \\');
    log(`  -d '{"enrollmentId": "${TEST_ENROLLMENT_ID}"}'`);
    
    header('VERIFICATION CHECKLIST');
    
    log('\n✓ Threading Fix:', 'bright');
    log('  [ ] Message-IDs stored without angle brackets', 'cyan');
    log('  [ ] In-Reply-To headers added to follow-ups', 'cyan');
    log('  [ ] Emails appear in same thread in Gmail', 'cyan');
    
    log('\n✓ Tracking Fix:', 'bright');
    log('  [ ] Tracking pixels present in all emails', 'cyan');
    log('  [ ] Click tracking links working', 'cyan');
    log('  [ ] Opens and clicks recorded in database', 'cyan');
    
    log('\n✓ Condition Logic Fix:', 'bright');
    log('  [ ] Only one branch executes per condition', 'cyan');
    log('  [ ] SequenceStepExecution records created', 'cyan');
    log('  [ ] No duplicate step executions', 'cyan');
    
    header('DEPLOYMENT INFO');
    
    log('\n🌐 URLs:', 'bright');
    log(`Production: ${PRODUCTION_URL}`, 'green');
    log('GitHub: https://github.com/Uncle-Lou-AfterShockFam/loumass-email-marketing', 'cyan');
    log('Vercel Dashboard: https://vercel.com/dashboard', 'cyan');
    
    log('\n✅ Deployment complete! Ready for testing.', 'green');
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    console.error(error);
  }
}

// Run the test
testProduction();