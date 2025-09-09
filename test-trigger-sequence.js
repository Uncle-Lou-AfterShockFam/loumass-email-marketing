// Test triggering sequence processing through API
const enrollmentId = 'cmfct1y7e0003jr047tlwar7k';

async function triggerProcessing() {
  console.log('Triggering sequence processing for enrollment:', enrollmentId);
  
  try {
    const response = await fetch(`http://localhost:3000/api/sequences/process/${enrollmentId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

triggerProcessing();