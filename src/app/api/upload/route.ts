import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.' 
      }, { status: 400 })
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File size too large. Maximum size is 5MB.' 
      }, { status: 400 })
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')
    
    // Generate unique filename
    const hash = crypto.createHash('md5').update(buffer).digest('hex')
    const ext = file.name.split('.').pop()
    const filename = `${hash}-${Date.now()}.${ext}`
    
    // For production, we'll use a data URL for now
    // In a real production app, you'd want to use a proper storage service like:
    // - Vercel Blob Storage
    // - AWS S3
    // - Cloudinary
    // - Uploadthing
    
    const dataUrl = `data:${file.type};base64,${base64}`
    
    // In development, try to save to file system
    if (process.env.NODE_ENV === 'development') {
      try {
        const { writeFile, mkdir } = await import('fs/promises')
        const { join } = await import('path')
        
        const uploadDir = join(process.cwd(), 'public', 'uploads', session.user.id)
        await mkdir(uploadDir, { recursive: true })
        
        const filePath = join(uploadDir, filename)
        await writeFile(filePath, buffer)
        
        // Return local file URL for development
        const publicUrl = `/uploads/${session.user.id}/${filename}`
        
        return NextResponse.json({ 
          url: publicUrl,
          filename: filename,
          size: file.size,
          type: file.type
        })
      } catch (fsError) {
        console.log('File system write failed, falling back to data URL:', fsError)
      }
    }
    
    // For production or if file system fails, return data URL
    // This embeds the image directly in the HTML
    return NextResponse.json({ 
      url: dataUrl,
      filename: filename,
      size: file.size,
      type: file.type,
      note: 'Image embedded as data URL. For production, consider using cloud storage.'
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ 
      error: 'Failed to upload file' 
    }, { status: 500 })
  }
}