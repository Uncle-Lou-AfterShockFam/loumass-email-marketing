// Debug why the tracking stripping is removing fallback thread history

const testHtmlWithFallback = `<div dir="ltr"><div>NO REPLY!</div><div><br></div>Hey L!<div><br></div><div>Here's our website:<br><a href="https://aftershockfam.org">https://aftershockfam.org</a></div></div>
<br>
<div class="gmail_quote gmail_quote_container">
  <div dir="ltr" class="gmail_attr">On Mon, Sep 09, 2025 at 3:35 PM Louis Piotti <ljpiotti@aftershockfam.org> wrote:<br></div>
  <blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex">
    <div>Subject: Hey L!</div>
  </blockquote>
</div>`;

console.log('=== DEBUGGING TRACKING STRIPPING ===\n');
console.log('Input HTML length:', testHtmlWithFallback.length);

// Simulate the stripTrackingFromQuotedContent method
function debugStripTracking(html) {
  console.log('\n1. Finding gmail_quote section...');
  const quoteStartRegex = /<(?:div|blockquote)[^>]*class="gmail_quote[^"]*"[^>]*>/i;
  const quoteMatch = html.match(quoteStartRegex);
  
  if (!quoteMatch) {
    console.log('   ❌ No gmail_quote found - returning original HTML');
    return html;
  }
  
  console.log('   ✅ Found gmail_quote section');
  console.log('   Match:', quoteMatch[0]);
  
  const quoteIndex = html.indexOf(quoteMatch[0]);
  console.log('   Quote starts at index:', quoteIndex);
  
  const mainContent = html.substring(0, quoteIndex);
  let quotedContent = html.substring(quoteIndex);
  
  console.log('\n2. Content split:');
  console.log('   Main content length:', mainContent.length);
  console.log('   Quoted content length:', quotedContent.length);
  
  console.log('\n3. Looking for tracking in quoted content...');
  const trackingBefore = (quotedContent.match(/\/api\/track\/click\//g) || []).length;
  const pixelsBefore = (quotedContent.match(/\/api\/track\/open\//g) || []).length;
  console.log(`   Tracked links before: ${trackingBefore}`);
  console.log(`   Tracking pixels before: ${pixelsBefore}`);
  
  // Strip tracking pixels
  quotedContent = quotedContent.replace(
    /<img[^>]*\/api\/track\/open\/[^>]*>/gi,
    ''
  );
  
  // Strip tracked links
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi;
  quotedContent = quotedContent.replace(linkRegex, (match, quote, url) => {
    const trackingMatch = url.match(/\/api\/track\/click\/[^?]+\?u=(.+)/);
    if (trackingMatch) {
      try {
        const originalUrl = decodeURIComponent(trackingMatch[1]);
        console.log(`   Reverting tracked URL: ${url} -> ${originalUrl}`);
        return match.replace(url, originalUrl);
      } catch (e) {
        console.log('   Failed to decode tracked URL, keeping as-is');
        return match;
      }
    }
    return match;
  });
  
  const trackingAfter = (quotedContent.match(/\/api\/track\/click\//g) || []).length;
  const pixelsAfter = (quotedContent.match(/\/api\/track\/open\//g) || []).length;
  console.log(`   Tracked links after: ${trackingAfter}`);
  console.log(`   Tracking pixels after: ${pixelsAfter}`);
  
  const result = mainContent + quotedContent;
  console.log('\n4. Final result:');
  console.log('   Final HTML length:', result.length);
  console.log('   Quoted section preserved:', quotedContent.length > 50);
  
  return result;
}

const result = debugStripTracking(testHtmlWithFallback);

console.log('\n=== FINAL COMPARISON ===');
console.log('Original length:', testHtmlWithFallback.length);
console.log('Result length:', result.length);
console.log('Content preserved:', result.length === testHtmlWithFallback.length);

if (result.length !== testHtmlWithFallback.length) {
  console.log('\n❌ CONTENT WAS LOST!');
  console.log('Original (last 200 chars):');
  console.log(testHtmlWithFallback.slice(-200));
  console.log('\nResult (last 200 chars):');
  console.log(result.slice(-200));
} else {
  console.log('\n✅ Content preserved correctly');
}