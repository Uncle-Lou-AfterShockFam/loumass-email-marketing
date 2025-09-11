// Script to demonstrate the fix for tracking in quoted content

function stripTrackingFromQuotedContent(html) {
  console.log('=== Stripping Tracking from Quoted Content ===');
  console.log('Input HTML length:', html.length);
  
  // Find gmail_quote section
  const quoteStartRegex = /<(?:div|blockquote)[^>]*class="gmail_quote[^"]*"[^>]*>/i;
  const quoteMatch = html.match(quoteStartRegex);
  
  if (!quoteMatch) {
    console.log('No quoted section found, returning original HTML');
    return html;
  }
  
  // Split content at quote boundary
  const quoteIndex = html.indexOf(quoteMatch[0]);
  const mainContent = html.substring(0, quoteIndex);
  let quotedContent = html.substring(quoteIndex);
  
  console.log('Found quoted section at index:', quoteIndex);
  console.log('Main content length:', mainContent.length);
  console.log('Quoted content length:', quotedContent.length);
  
  // Count tracking links before
  const trackingBefore = (quotedContent.match(/\/api\/track\/click\//g) || []).length;
  console.log('Tracking links in quoted section BEFORE:', trackingBefore);
  
  // Strip ALL tracking from quoted content
  // 1. Remove tracking pixels
  quotedContent = quotedContent.replace(
    /<img[^>]*\/api\/track\/open\/[^>]*>/gi,
    ''
  );
  
  // 2. Replace tracked links with original URLs
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi;
  quotedContent = quotedContent.replace(linkRegex, (match, quote, url) => {
    // Check if this is a tracking URL
    const trackingMatch = url.match(/\/api\/track\/click\/[^?]+\?u=(.+)/);
    if (trackingMatch) {
      // Decode the original URL
      const originalUrl = decodeURIComponent(trackingMatch[1]);
      console.log('  Stripping tracking from:', url.substring(0, 50) + '...');
      console.log('  Original URL:', originalUrl);
      return match.replace(url, originalUrl);
    }
    return match;
  });
  
  // Count tracking links after
  const trackingAfter = (quotedContent.match(/\/api\/track\/click\//g) || []).length;
  console.log('Tracking links in quoted section AFTER:', trackingAfter);
  
  // Recombine
  const result = mainContent + quotedContent;
  console.log('Final HTML length:', result.length);
  
  return result;
}

// Test with the actual problematic email
const actualEmail = `<div dir="ltr"><div>NO REPLY!</div><div><br></div>Hey Lou!<div><br></div>
<div>Here's our website:<br><a href="https://loumassbeta.vercel.app/api/track/click/c2VxOmNtZmYwam1wZjAwMDFsNTA0ZjBlZnN3ZDE6NDoxNzU3NTcxMzkwMjgy?u=https%3A%2F%2Faftershockfam.org">https://aftershockfam.org</a></div></div>
<br>
<div class="gmail_quote gmail_quote_container">
  <div dir="ltr" class="gmail_attr">On Thu, Sep 11, 2025 at 2:14 AM Louis Piotti wrote:<br></div>
  <blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex">
    <html><body>Hey Lou!<div><br></div><div>Here's our website:<br>
    <a href="https://loumassbeta.vercel.app/api/track/click/OLD_TRACKING_ID?u=https%3A%2F%2Faftershockfam.org">https://aftershockfam.org</a>
    </div>
    <img src="https://loumassbeta.vercel.app/api/track/open/OLD_TRACKING_ID?cb=abc123" width="1" height="1" style="display:none;" alt="">
    </body></html>
  </blockquote>
</div>`;

console.log('\n=== TESTING FIX ===\n');
const fixed = stripTrackingFromQuotedContent(actualEmail);

// Verify the fix
console.log('\n=== VERIFICATION ===');
const mainTracking = (fixed.substring(0, 300).match(/\/api\/track\/click\//g) || []).length;
const quoteTracking = (fixed.substring(300).match(/\/api\/track\/click\//g) || []).length;

console.log('Tracking links in main content:', mainTracking);
console.log('Tracking links in quoted section:', quoteTracking);

if (quoteTracking === 0) {
  console.log('\n✅ SUCCESS: All tracking removed from quoted content!');
} else {
  console.log('\n❌ FAILURE: Still have tracking in quoted content');
}

// Show the cleaned quoted section
console.log('\n=== CLEANED QUOTED SECTION ===');
const quoteStart = fixed.indexOf('gmail_quote');
if (quoteStart > 0) {
  console.log(fixed.substring(quoteStart, Math.min(fixed.length, quoteStart + 500)));
}