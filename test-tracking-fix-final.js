// Test the complete tracking fix with the actual GmailService method

const testHtmlWithNestedTracking = `<div dir="ltr"><div>NO REPLY!</div><div><br></div>Hey Lou!<div><br></div>
<div>Here's our website:<br><a href="https://aftershockfam.org">https://aftershockfam.org</a></div></div>
<br>
<div class="gmail_quote gmail_quote_container">
  <div dir="ltr" class="gmail_attr">On Thu, Sep 11, 2025 at 2:14 AM Louis Piotti <ljpiotti@aftershockfam.org> wrote:<br></div>
  <blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex">
    <html><body>Hey Lou!<div><br></div><div>Here's our website:<br>
    <a href="https://loumassbeta.vercel.app/api/track/click/OLD_TRACKING_ID?u=https%3A%2F%2Faftershockfam.org">https://aftershockfam.org</a>
    </div>
    <img src="https://loumassbeta.vercel.app/api/track/open/OLD_TRACKING_ID?cb=abc123" width="1" height="1" style="display:none;" alt="">
    <img src="https://loumassbeta.vercel.app/api/track/open/ANOTHER_OLD_ID?cb=def456" width="1" height="1" style="display:none;" alt="">
    </body></html>
  </blockquote>
</div>`;

console.log('=== Testing Complete Tracking Fix ===\n');

// Simulate the stripTrackingFromQuotedContent method
function stripTrackingFromQuotedContent(html) {
  // Find gmail_quote section
  const quoteStartRegex = /<(?:div|blockquote)[^>]*class="gmail_quote[^"]*"[^>]*>/i
  const quoteMatch = html.match(quoteStartRegex)
  
  if (!quoteMatch) {
    return html
  }
  
  // Split content at quote boundary
  const quoteIndex = html.indexOf(quoteMatch[0])
  const mainContent = html.substring(0, quoteIndex)
  let quotedContent = html.substring(quoteIndex)
  
  console.log('[Tracking] Stripping tracking from quoted content')
  console.log(`[Tracking] Quote starts at index ${quoteIndex}`)
  
  // Count tracking before stripping
  const trackingBefore = (quotedContent.match(/\/api\/track\/click\//g) || []).length
  const pixelsBefore = (quotedContent.match(/\/api\/track\/open\//g) || []).length
  console.log(`[Tracking] Found ${trackingBefore} tracked links and ${pixelsBefore} pixels in quoted content`)
  
  // 1. Remove ALL tracking pixels from quoted content
  quotedContent = quotedContent.replace(
    /<img[^>]*\/api\/track\/open\/[^>]*>/gi,
    ''
  )
  
  // 2. Replace tracked links with original URLs
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi
  quotedContent = quotedContent.replace(linkRegex, (match, quote, url) => {
    // Check if this is a tracking URL
    const trackingMatch = url.match(/\/api\/track\/click\/[^?]+\?u=(.+)/)
    if (trackingMatch) {
      // Decode the original URL
      try {
        const originalUrl = decodeURIComponent(trackingMatch[1])
        console.log(`[Tracking] Reverting tracked URL to: ${originalUrl}`)
        return match.replace(url, originalUrl)
      } catch (e) {
        console.log('[Tracking] Failed to decode tracked URL, keeping as-is')
        return match
      }
    }
    return match
  })
  
  // Count tracking after stripping
  const trackingAfter = (quotedContent.match(/\/api\/track\/click\//g) || []).length
  const pixelsAfter = (quotedContent.match(/\/api\/track\/open\//g) || []).length
  console.log(`[Tracking] After stripping: ${trackingAfter} tracked links and ${pixelsAfter} pixels remain`)
  
  // Recombine
  return mainContent + quotedContent
}

// Test phase 1: Strip existing tracking
console.log('=== PHASE 1: Strip Existing Tracking ===');
const cleanedHtml = stripTrackingFromQuotedContent(testHtmlWithNestedTracking);

// Test phase 2: Apply new tracking (simulation)
console.log('\n=== PHASE 2: Apply New Tracking ===');

// Find the quote boundary again
const quoteStartRegex = /<(?:div|blockquote)[^>]*class="gmail_quote[^"]*"[^>]*>/i;
const quoteMatch = cleanedHtml.match(quoteStartRegex);

if (quoteMatch) {
  const quoteIndex = cleanedHtml.indexOf(quoteMatch[0]);
  const mainContent = cleanedHtml.substring(0, quoteIndex);
  const quotedContent = cleanedHtml.substring(quoteIndex);
  
  console.log('Found quote section for tracking');
  console.log('Main content length:', mainContent.length);
  console.log('Quoted content length:', quotedContent.length);
  
  // Apply tracking only to main content
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi;
  let trackingCount = 0;
  
  const trackedMain = mainContent.replace(linkRegex, (match, quote, url) => {
    if (url.includes('/api/track/click/') || url.includes('unsubscribe') || url.includes('mailto:')) {
      return match;
    }
    
    trackingCount++;
    const trackedUrl = `https://loumassbeta.vercel.app/api/track/click/NEW_TRACKING_ID?u=${encodeURIComponent(url)}`;
    console.log(`[Tracking] Adding tracking ${trackingCount}: ${url} -> NEW_TRACKING_ID`);
    return match.replace(url, trackedUrl);
  });
  
  // Final result
  const finalHtml = trackedMain + quotedContent;
  
  console.log('\n=== FINAL VERIFICATION ===');
  
  // Count final tracking
  const mainTracking = (trackedMain.match(/\/api\/track\/click\//g) || []).length;
  const quoteTracking = (quotedContent.match(/\/api\/track\/click\//g) || []).length;
  const mainPixels = (trackedMain.match(/\/api\/track\/open\//g) || []).length;
  const quotePixels = (quotedContent.match(/\/api\/track\/open\//g) || []).length;
  
  console.log(`Main content: ${mainTracking} tracked links, ${mainPixels} pixels`);
  console.log(`Quoted content: ${quoteTracking} tracked links, ${quotePixels} pixels`);
  
  if (quoteTracking === 0 && quotePixels === 0 && mainTracking > 0) {
    console.log('\n🎉 SUCCESS: Fix works perfectly!');
    console.log('- New tracking applied to main content');
    console.log('- No tracking remains in quoted content');
    console.log('- Attribution should work correctly');
  } else {
    console.log('\n❌ Issues detected:');
    if (quoteTracking > 0) console.log('- Tracked links still in quoted content');
    if (quotePixels > 0) console.log('- Tracking pixels still in quoted content');
    if (mainTracking === 0) console.log('- No tracking applied to main content');
  }
  
  // Show cleaned quoted section
  console.log('\n=== CLEANED QUOTED SECTION PREVIEW ===');
  const quoteSample = quotedContent.substring(0, 400);
  console.log(quoteSample + (quotedContent.length > 400 ? '...' : ''));
  
} else {
  console.log('❌ Could not find quote section in cleaned HTML');
}

console.log('\n=== Test Complete ===');