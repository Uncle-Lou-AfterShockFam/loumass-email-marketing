// Debug the full flow from sequence processor to tracking addition

// Simulate what the sequence processor builds for fallback thread history
const mainContent = `<div>NO REPLY!</div><div><br></div>Hey L!<div><br></div><div>Here's our website:<br><a href="https://aftershockfam.org">https://aftershockfam.org</a></div>`;

const fallbackThreadHistory = `<div class="gmail_quote gmail_quote_container">
  <div dir="ltr" class="gmail_attr">On Mon, Sep 09, 2025 at 3:35 PM Louis Piotti <ljpiotti@aftershockfam.org> wrote:<br></div>
  <blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex">
    <div>Subject: Hey L!</div>
  </blockquote>
</div>`;

// This is what sequence processor creates (finalHtmlContent)
const sequenceOutput = `<div dir="ltr">${mainContent}</div>
<br>
${fallbackThreadHistory}`;

console.log('=== FULL FLOW DEBUG ===\n');
console.log('1. Sequence processor creates finalHtmlContent:');
console.log('   Length:', sequenceOutput.length);
console.log('   Has gmail_quote:', sequenceOutput.includes('gmail_quote'));

// Simulate addTrackingToEmail flow
console.log('\n2. addTrackingToEmail called...');

// Step 1: Strip tracking from quoted content
function simulateStripTracking(html) {
  const quoteStartRegex = /<(?:div|blockquote)[^>]*class="gmail_quote[^"]*"[^>]*>/i;
  const quoteMatch = html.match(quoteStartRegex);
  
  if (!quoteMatch) {
    return html;
  }
  
  const quoteIndex = html.indexOf(quoteMatch[0]);
  const mainContent = html.substring(0, quoteIndex);
  let quotedContent = html.substring(quoteIndex);
  
  console.log('   Found quote section at index:', quoteIndex);
  console.log('   Main content length:', mainContent.length);
  console.log('   Quoted content length:', quotedContent.length);
  
  // No tracking to strip in this case, so content should be unchanged
  return mainContent + quotedContent;
}

const afterStripping = simulateStripTracking(sequenceOutput);
console.log('   After stripping - Length:', afterStripping.length);
console.log('   Content preserved:', afterStripping.length === sequenceOutput.length);

// Step 2: Add tracking to links (only in main content)
function simulateAddTracking(html) {
  const quoteStartRegex = /<(?:div|blockquote)[^>]*class="gmail_quote[^"]*"[^>]*>/i;
  const quoteMatch = html.match(quoteStartRegex);
  
  let mainContent = html;
  let quotedContent = '';
  
  if (quoteMatch) {
    const quoteIndex = html.indexOf(quoteMatch[0]);
    mainContent = html.substring(0, quoteIndex);
    quotedContent = html.substring(quoteIndex);
  }
  
  console.log('   Main content for tracking:', mainContent.length);
  console.log('   Quoted content to preserve:', quotedContent.length);
  
  // Add tracking only to main content
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi;
  let trackingCount = 0;
  
  const trackedMain = mainContent.replace(linkRegex, (match, quote, url) => {
    if (url.includes('/api/track/click/') || url.includes('mailto:') || url.includes('unsubscribe')) {
      return match;
    }
    
    trackingCount++;
    const trackedUrl = `https://loumassbeta.vercel.app/api/track/click/TRACKING_ID?u=${encodeURIComponent(url)}`;
    console.log(`   Adding tracking ${trackingCount}: ${url}`);
    return match.replace(url, trackedUrl);
  });
  
  // Add tracking pixel to main content
  const pixelHtml = '<img src="https://loumassbeta.vercel.app/api/track/open/TRACKING_ID?cb=abc123" width="1" height="1" style="display:none;" alt="">';
  const finalMain = trackedMain + '\n' + pixelHtml;
  
  console.log('   Links tracked:', trackingCount);
  console.log('   Pixel added:', pixelHtml.length > 0);
  
  return finalMain + quotedContent;
}

const finalResult = simulateAddTracking(afterStripping);

console.log('\n3. Final result:');
console.log('   Final length:', finalResult.length);
console.log('   Has tracking:', finalResult.includes('/api/track/'));
console.log('   Has thread history:', finalResult.includes('Subject: Hey L!'));

if (!finalResult.includes('Subject: Hey L!')) {
  console.log('\n❌ THREAD HISTORY LOST!');
  console.log('Looking for quote section...');
  const hasQuote = finalResult.includes('gmail_quote');
  console.log('   Has gmail_quote class:', hasQuote);
  
  if (hasQuote) {
    const quoteIndex = finalResult.indexOf('gmail_quote');
    const aroundQuote = finalResult.substring(Math.max(0, quoteIndex - 100), quoteIndex + 200);
    console.log('   Content around quote:', aroundQuote);
  }
} else {
  console.log('\n✅ Thread history preserved');
}

// Show what actually gets sent
console.log('\n=== WHAT GETS SENT ===');
console.log('Final HTML (truncated):');
console.log(finalResult.substring(0, 300) + '...');