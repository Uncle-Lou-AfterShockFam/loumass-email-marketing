const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testThreadLogic() {
  console.log('Testing thread history logic...\n');
  
  // Simulate what should happen in sequence processor
  const enrollment = {
    currentStep: 3,
    gmailThreadId: '19931eac561aa338',
    contact: { email: 'test@example.com' }
  };
  
  const step = {
    type: 'email',
    subject: 'Follow up message',
    content: '<div>This is the new message content</div>',
    replyToThread: true
  };
  
  // Test the conditions
  console.log('Conditions check:');
  console.log('- currentStep > 0:', enrollment.currentStep > 0);
  console.log('- gmailThreadId exists:', !!enrollment.gmailThreadId);
  console.log('- Should include thread history:', enrollment.currentStep > 0 && enrollment.gmailThreadId);
  
  // Simulate what the final content should look like
  const newContent = step.content;
  
  // This is what the user expects - Gmail format with nested thread history
  const expectedFormat = `<div dir="ltr">${newContent}</div>
<br>
<div class="gmail_quote gmail_quote_container">
  <div dir="ltr" class="gmail_attr">On Mon, Sep 9, 2025 at 11:02 PM Louis Piotti &lt;ljpiotti@aftershockfam.org&gt; wrote:<br></div>
  <blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex">
    <div dir="ltr">Previous message content here</div>
    <br>
    <div class="gmail_quote gmail_quote_container">
      <div dir="ltr" class="gmail_attr">On Sun, Sep 8, 2025 at 10:30 PM Contact Name &lt;contact@example.com&gt; wrote:<br></div>
      <blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex">
        Even earlier message content
      </blockquote>
    </div>
  </blockquote>
</div>`;
  
  console.log('\nExpected format structure:');
  console.log('1. New message content at top');
  console.log('2. <br> separator');
  console.log('3. Gmail quote containers with proper nesting');
  console.log('4. Attribution lines with angle brackets around emails');
  console.log('5. Nested blockquotes for conversation history');
  
  console.log('\nWhat user is getting vs expecting:');
  console.log('❌ Getting: Just the new message without thread history');
  console.log('✅ Expecting: New message + full nested conversation history');
  
  await prisma.$disconnect();
}

testThreadLogic().catch(console.error);