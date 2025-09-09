const fetch = require('node-fetch');

async function checkReplies() {
  console.log('Checking for replies...');
  
  // You need to get a valid session token from your browser
  // Open the app, go to DevTools > Application > Cookies > next-auth.session-token
  const sessionToken = 'YOUR_SESSION_TOKEN_HERE';
  
  try {
    const response = await fetch('http://localhost:3000/api/gmail/check-replies', {
      method: 'POST',
      headers: {
        'Cookie': `next-auth.session-token=${sessionToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    console.log('Result:', result);
    
    if (result.repliesFound > 0) {
      console.log(`Found ${result.repliesFound} new replies!`);
      console.log('Processed replies:', result.processedReplies);
    } else {
      console.log('No new replies found');
    }
  } catch (error) {
    console.error('Error checking replies:', error);
  }
}

checkReplies();