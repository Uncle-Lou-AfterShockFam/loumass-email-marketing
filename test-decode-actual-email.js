// Decode the actual email to see what's happening
const actualEmail = `<div dir=3D"ltr"><div>NO REPLY!</div><div><br></div>Hey Lou!<div><br></div>=
<div>Here&#39;s our website:<br><a href=3D"https://loumassbeta.vercel.app/a=
pi/track/click/c2VxOmNtZmYwam1wZjAwMDFsNTA0ZjBlZnN3ZDE6NDoxNzU3NTcxMzkwMjgy=
?u=3Dhttps%3A%2F%2Faftershockfam.org">https://aftershockfam.org</a></div></=
div>
<br>
<div class=3D"gmail_quote gmail_quote_container">
  <div dir=3D"ltr" class=3D"gmail_attr">On Thu, Sep 11, 2025 at 2:14 AM Lou=
is Piotti  wrote:<br></div>
  <blockquote class=3D"gmail_quote" style=3D"margin:0px 0px 0px 0.8ex;borde=
r-left:1px solid rgb(204,204,204);padding-left:1ex">
    <html><body>Hey Lou!<div><br></div><div>Here&#39;s our website:<br><a h=
ref=3D"https://loumassbeta.vercel.app/api/track/click/c2VxOmNtZmYwam1wZjAwM=
DFsNTA0ZjBlZnN3ZDE6NDoxNzU3NTcxMzkwMjgy?u=3Dhttps%3A%2F%2Floumassbeta.verce=
l.app%2Fapi%2Ftrack%2Fclick%2Fc2VxOmNtZmYwam1wZjAwMDFsNTA0ZjBlZnN3ZDE6MDoxN=
zU3NTcxMjU0NzI3%3Fu%3Dhttps%253A%252F%252Faftershockfam.org"><a href=3D"htt=
ps://loumassbeta.vercel.app/api/track/click/c2VxOmNtZmYwam1wZjAwMDFsNTA0ZjB=
lZnN3ZDE6NDoxNzU3NTcxMzkwMjgy?u=3Dhttps%3A%2F%2Floumassbeta.vercel.app%2Fap=
i%2Ftrack%2Fclick%2Fc2VxOmNtZmYwam1wZjAwMDFsNTA0ZjBlZnN3ZDE6MDoxNzU3NTcxMjU=
0NzI3%3Fu%3Dhttps%253A%252F%252Faftershockfam.org"><a href=3D"https://louma=
ssbeta.vercel.app/api/track/click/c2VxOmNtZmYwam1wZjAwMDFsNTA0ZjBlZnN3ZDE6N=
DoxNzU3NTcxMzkwMjgy?u=3Dhttps%3A%2F%2Faftershockfam.org">https://aftershock=
fam.org</a></a></a></div><img src=3D"https://loumassbeta.vercel.app/api/tra=
ck/open/c2VxOmNtZmYwam1wZjAwMDFsNTA0ZjBlZnN3ZDE6MDoxNzU3NTcxMjU0NzI3?cb=3Db=
imxbf" width=3D"1" height=3D"1" style=3D"display:none;" alt=3D""><img src=
=3D"https://loumassbeta.vercel.app/api/track/open/c2VxOmNtZmYwam1wZjAwMDFsN=
TA0ZjBlZnN3ZDE6MDoxNzU3NTcxMjU0NzI3?cb=3Dyk439k" width=3D"1" height=3D"1" s=
tyle=3D"display:none;" alt=3D""><img src=3D"https://loumassbeta.vercel.app/=
api/track/open/c2VxOmNtZmYwam1wZjAwMDFsNTA0ZjBlZnN3ZDE6NDoxNzU3NTcxMzkwMjgy=
?cb=3Dqo7bck" width=3D"1" height=3D"1" style=3D"display:none;" alt=3D""></b=
ody></html>
  </blockquote>
</div>`;

// Decode quoted-printable encoding
function decodeQuotedPrintable(str) {
  return str.replace(/=([0-9A-F]{2})/gi, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  }).replace(/=\r?\n/g, '');
}

const decoded = decodeQuotedPrintable(actualEmail);
console.log('=== DECODED EMAIL ===\n');
console.log(decoded);

// Analyze the tracking
console.log('\n=== TRACKING ANALYSIS ===\n');

// Count tracking links
const trackingLinks = decoded.match(/\/api\/track\/click\//g) || [];
console.log(`Total tracking links: ${trackingLinks.length}`);

// Find nested tracking (tracking URL inside another tracking URL)
const nestedPattern = /\/api\/track\/click\/[^"]*\?u=[^"]*%2Fapi%2Ftrack%2Fclick/;
const hasNested = nestedPattern.test(decoded);
console.log(`Has nested tracking: ${hasNested ? '❌ YES' : '✅ NO'}`);

if (hasNested) {
  const match = decoded.match(nestedPattern);
  console.log('\n❌ NESTED TRACKING FOUND:');
  console.log(match[0].substring(0, 200) + '...');
  
  // Decode the nested URL
  const urlMatch = match[0].match(/u=([^"&]+)/);
  if (urlMatch) {
    const decodedUrl = decodeURIComponent(urlMatch[1]);
    console.log('\nDecoded nested URL:', decodedUrl.substring(0, 150) + '...');
  }
}

// Check attribution line
const attributionPattern = /On .+ at .+ (.+) wrote:/;
const attrMatch = decoded.match(attributionPattern);
if (attrMatch) {
  console.log('\n📧 Attribution line found:');
  console.log(`   Full: "${attrMatch[0]}"`);
  console.log(`   Sender part: "${attrMatch[1]}"`);
  
  if (!attrMatch[1].includes('<') || !attrMatch[1].includes('>')) {
    console.log('   ❌ Missing email in angle brackets!');
  } else {
    console.log('   ✅ Has email in angle brackets');
  }
}