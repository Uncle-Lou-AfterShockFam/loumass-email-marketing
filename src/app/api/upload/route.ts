import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { writeFile } from 'fs/promises'
import { join } from 'path'
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

    // Generate unique filename
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    const hash = crypto.createHash('md5').update(buffer).digest('hex')
    const ext = file.name.split('.').pop()
    const filename = `${hash}-${Date.now()}.${ext}`
    
    // Create user-specific directory path
    const uploadDir = join(process.cwd(), 'public', 'uploads', session.user.id)
    
    // Ensure directory exists
    const { mkdir } = await import('fs/promises')
    await mkdir(uploadDir, { recursive: true })
    
    // Save file
    const filePath = join(uploadDir, filename)
    await writeFile(filePath, buffer)
    
    // Return public URL
    const publicUrl = `/uploads/${session.user.id}/${filename}`
    
    return NextResponse.json({ 
      url: publicUrl,
      filename: filename,
      size: file.size,
      type: file.type
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ 
      error: 'Failed to upload file' 
    }, { status: 500 })
  }
}