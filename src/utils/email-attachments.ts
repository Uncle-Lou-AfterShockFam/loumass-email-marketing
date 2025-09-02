import { EmailAttachment } from '@/services/gmail-service'

/**
 * Extract embedded images from HTML content and convert them to attachments
 * This helps avoid the 4.5MB request size limit by sending images as attachments
 * instead of embedded base64 data URLs
 */
export function extractImagesAsAttachments(htmlContent: string): {
  cleanedHtml: string
  attachments: EmailAttachment[]
} {
  const attachments: EmailAttachment[] = []
  let attachmentCounter = 0
  
  // Regular expression to find base64 embedded images
  const imgRegex = /<img[^>]+src="data:([^;]+);base64,([^"]+)"[^>]*>/gi
  
  // Replace embedded images with CID references and extract as attachments
  const cleanedHtml = htmlContent.replace(imgRegex, (match, mimeType, base64Data, offset) => {
    attachmentCounter++
    const filename = `image${attachmentCounter}.${getExtensionFromMimeType(mimeType)}`
    const cid = `image${attachmentCounter}@loumass.generated`
    
    // Add to attachments array
    attachments.push({
      filename,
      content: base64Data,
      contentType: mimeType,
      cid // Content-ID for embedding
    })
    
    // Replace the src with a CID reference
    return match.replace(/src="[^"]+"/, `src="cid:${cid}"`)
  })
  
  return { cleanedHtml, attachments }
}

/**
 * Get file extension from MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp'
  }
  
  return mimeToExt[mimeType.toLowerCase()] || 'png'
}

/**
 * Check if content size exceeds Vercel's limit
 */
export function isContentTooLarge(content: string, maxSizeMB: number = 4): boolean {
  const sizeInBytes = new Blob([content]).size
  const sizeInMB = sizeInBytes / (1024 * 1024)
  return sizeInMB > maxSizeMB
}