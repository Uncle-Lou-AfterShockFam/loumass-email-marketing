// Test why tracking prevention isn't working
const testHtml = `<div dir="ltr"><div>NO REPLY!</div><div><br></div>Hey Lou!<div><br></div>
<div>Here's our website:<br><a href="https://aftershockfam.org">https://aftershockfam.org</a></div></div>
<br>
<div class="gmail_quote gmail_quote_container">
  <div dir="ltr" class="gmail_attr">On Thu, Sep 11, 2025 at 2:14 AM Louis Piotti <ljpiotti@aftershockfam.org> wrote:<br></div>
  <blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex">
    <html><body>Hey Lou!<div><br></div><div>Here's our website:<br>
    <a href="https://aftershockfam.org">https://aftershockfam.org</a>
    </div></body></html>
  </blockquote>
</div>`;

console.log('=== Testing Tracking Prevention Logic ===\n');
console.log('Input HTML length:', testHtml.length);

// Test the regex for finding gmail_quote
const quoteStartRegex = /<(?:div|blockquote)[^>]*class="gmail_quote[^"]*"[^>]*>/i;
const quoteMatch = testHtml.match(quoteStartRegex);

if (quoteMatch) {
  console.log('✅ Found gmail_quote section!');
  console.log('   Match:', quoteMatch[0]);
  
  const quoteIndex = testHtml.indexOf(quoteMatch[0]);
  console.log('   Quote starts at index:', quoteIndex);
  
  const mainContent = testHtml.substring(0, quoteIndex);
  const quotedContent = testHtml.substring(quoteIndex);
  
  console.log('\n📊 Content Split:');
  console.log('   Main content length:', mainContent.length);
  console.log('   Quoted content length:', quotedContent.length);
  
  // Count links in each section
  const linksInMain = (mainContent.match(/<a\s+href=/gi) || []).length;
  const linksInQuote = (quotedContent.match(/<a\s+href=/gi) || []).length;
  
  console.log('\n🔗 Link Count:');
  console.log('   Links in main content:', linksInMain);
  console.log('   Links in quoted section:', linksInQuote);
  
  // Simulate tracking replacement in main content only
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi;
  let linkCount = 0;
  
  const trackedMain = mainContent.replace(linkRegex, (match, quote, url) => {
    // Skip if already tracked
    if (url.includes('/api/track/click/')) {
      return match;
    }
    
    // Don't track unsubscribe or mailto links
    if (url.includes('unsubscribe') || url.includes('mailto:')) {
      return match;
    }
    
    linkCount++;
    const trackedUrl = `https://loumassbeta.vercel.app/api/track/click/TEST_ID?u=${encodeURIComponent(url)}`;
    console.log(`\n   Tracking link ${linkCount}:`);
    console.log(`      Original: ${url}`);
    console.log(`      Tracked: ${trackedUrl.substring(0, 80)}...`);
    return match.replace(url, trackedUrl);
  });
  
  // Combine back
  const finalHtml = trackedMain + quotedContent;
  
  console.log('\n✅ Result:');
  console.log('   Links tracked in main content:', linkCount);
  console.log('   Links in quoted section remain untracked');
  
  // Verify quoted section wasn't modified
  const quotedLinksAfter = (quotedContent.match(/\/api\/track\/click\//g) || []).length;
  console.log('   Tracked links in quoted section:', quotedLinksAfter);
  
  if (quotedLinksAfter === 0) {
    console.log('\n🎉 SUCCESS: Tracking prevention logic works correctly!');
  } else {
    console.log('\n❌ FAILURE: Quoted section was tracked!');
  }
  
} else {
  console.log('❌ No gmail_quote section found!');
  console.log('   This would cause ALL links to be tracked');
}

// Now test with the actual problematic HTML structure
console.log('\n\n=== Testing with Actual Problematic Structure ===\n');

// This is closer to what's actually happening
const problematicHtml = `<div>NO REPLY!</div><div><br></div>Hey Lou!<div><br></div>
<div>Here's our website:<br><a href="https://aftershockfam.org">https://aftershockfam.org</a></div>
<br>
<div class="gmail_quote gmail_quote_container">
  <div dir="ltr" class="gmail_attr">On Thu, Sep 11, 2025 at 2:14 AM Louis Piotti wrote:<br></div>
  <blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex">
    <html><body>Hey Lou!<div><br></div><div>Here's our website:<br>
    <a href="https://aftershockfam.org">https://aftershockfam.org</a>
    </div></body></html>
  </blockquote>
</div>`;

const quoteMatch2 = problematicHtml.match(quoteStartRegex);
if (quoteMatch2) {
  console.log('✅ Found gmail_quote in problematic HTML');
  const idx = problematicHtml.indexOf(quoteMatch2[0]);
  console.log('   Quote starts at index:', idx);
  console.log('   Content before quote:', problematicHtml.substring(0, Math.min(idx, 100)) + '...');
} else {
  console.log('❌ Could not find gmail_quote in problematic HTML!');
}