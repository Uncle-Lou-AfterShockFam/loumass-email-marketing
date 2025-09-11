const testHtml = `<div dir="ltr">Hey LOUIS!<div><br></div><div>Here's our website:<br><a href="https://aftershockfam.org">https://aftershockfam.org</a></div></div>
<br>
<div class="gmail_quote gmail_quote_container">
  <div dir="ltr" class="gmail_attr">On Thu, Sep 11, 2025 at 1:48 AM Louis Piotti wrote:<br></div>
  <blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex">
    <html><body>Hey LOUIS!<div><br></div><div>Here's our website:<br><a href="https://tracked.url">https://aftershockfam.org</a></div></body></html>
  </blockquote>
</div>`

const regex = /(<(?:blockquote|div)[^>]*class="gmail_quote[^"]*"[^>]*>|<\/(?:blockquote|div)>)/i

const sections = testHtml.split(regex)

console.log('Total sections:', sections.length)
sections.forEach((section, i) => {
  console.log(`\nSection ${i}:`)
  console.log('Length:', section.length)
  console.log('Starts with:', section.substring(0, 50))
  console.log('Is quote marker:', section.match(/class="gmail_quote/i) ? 'YES' : 'NO')
})
