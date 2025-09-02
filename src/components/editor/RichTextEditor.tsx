'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter your content...',
  className = '',
  disabled = false
}: RichTextEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize editor content on mount
  useEffect(() => {
    if (editorRef.current && !initialized) {
      editorRef.current.innerHTML = value || ''
      setInitialized(true)
    }
  }, [value, initialized])

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const newValue = editorRef.current.innerHTML
      onChange(newValue)
    }
  }, [onChange])

  const handleFocus = useCallback(() => {
    setIsEditing(true)
  }, [])

  const handleBlur = useCallback(() => {
    setIsEditing(false)
  }, [])

  const formatText = useCallback((command: string, value?: string) => {
    if (disabled) return
    
    document.execCommand(command, false, value)
    if (editorRef.current) {
      editorRef.current.focus()
      onChange(editorRef.current.innerHTML)
    }
  }, [disabled, onChange])

  const insertLink = useCallback(() => {
    if (disabled) return
    
    const url = prompt('Enter URL:')
    if (url) {
      formatText('createLink', url)
    }
  }, [disabled, formatText])

  const handleImageClick = useCallback(() => {
    if (disabled || isUploading) return
    fileInputRef.current?.click()
  }, [disabled, isUploading])

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const toastId = toast.loading('Uploading image...')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const data = await response.json()
      
      // Insert image into editor
      if (editorRef.current) {
        const selection = window.getSelection()
        const range = selection?.getRangeAt(0)
        
        const img = document.createElement('img')
        img.src = data.url
        img.style.maxWidth = '100%'
        img.style.height = 'auto'
        img.style.display = 'block'
        img.style.margin = '10px 0'
        
        if (range) {
          range.insertNode(img)
          range.collapse(false)
        } else {
          editorRef.current.appendChild(img)
        }
        
        // Trigger input event to ensure React state updates
        const inputEvent = new Event('input', { bubbles: true, cancelable: true })
        editorRef.current.dispatchEvent(inputEvent)
        
        // Also call onChange directly to ensure state is updated
        onChange(editorRef.current.innerHTML)
        editorRef.current.focus()
      }

      toast.success('Image uploaded successfully', { id: toastId })
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload image', { id: toastId })
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [disabled, onChange])

  const insertImageFromURL = useCallback(() => {
    if (disabled) return
    
    const url = prompt('Enter image URL:')
    if (url) {
      if (editorRef.current) {
        const selection = window.getSelection()
        const range = selection?.getRangeAt(0)
        
        const img = document.createElement('img')
        img.src = url
        img.style.maxWidth = '100%'
        img.style.height = 'auto'
        img.style.display = 'block'
        img.style.margin = '10px 0'
        
        if (range) {
          range.insertNode(img)
          range.collapse(false)
        } else {
          editorRef.current.appendChild(img)
        }
        
        // Trigger input event to ensure React state updates
        const inputEvent = new Event('input', { bubbles: true, cancelable: true })
        editorRef.current.dispatchEvent(inputEvent)
        
        // Also call onChange directly to ensure state is updated
        onChange(editorRef.current.innerHTML)
        editorRef.current.focus()
      }
    }
  }, [disabled, onChange])

  const toolbarButtons = [
    { command: 'bold', icon: 'B', title: 'Bold' },
    { command: 'italic', icon: 'I', title: 'Italic' },
    { command: 'underline', icon: 'U', title: 'Underline' },
    { command: 'separator' },
    { command: 'justifyLeft', icon: '⫷', title: 'Align Left' },
    { command: 'justifyCenter', icon: '⫸', title: 'Align Center' },
    { command: 'justifyRight', icon: '⫸', title: 'Align Right' },
    { command: 'separator' },
    { command: 'insertUnorderedList', icon: '•', title: 'Bullet List' },
    { command: 'insertOrderedList', icon: '1.', title: 'Numbered List' },
    { command: 'separator' },
    { command: 'link', icon: '🔗', title: 'Insert Link', handler: insertLink },
    { command: 'image', icon: '🖼️', title: 'Upload Image', handler: handleImageClick },
    { command: 'imageUrl', icon: '🌐', title: 'Image from URL', handler: insertImageFromURL },
  ]

  return (
    <div className={`border border-gray-300 dark:border-gray-600 rounded-lg bg-white ${disabled ? 'opacity-50' : ''} ${className}`}>
      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Toolbar */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-2 flex flex-wrap gap-1">
        {toolbarButtons.map((button, index) => {
          if (button.command === 'separator') {
            return <div key={index} className="w-px bg-gray-300 mx-1 self-stretch" />
          }

          const isImageButton = button.command === 'image'
          const buttonDisabled = disabled || (isImageButton && isUploading)

          return (
            <button
              key={button.command}
              type="button"
              disabled={buttonDisabled}
              onClick={() => button.handler ? button.handler() : formatText(button.command)}
              className={`px-2 py-1 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded border border-transparent hover:border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                isImageButton && isUploading ? 'animate-pulse' : ''
              }`}
              title={button.title}
            >
              {button.icon}
            </button>
          )
        })}
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="min-h-[200px] p-4 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
        style={{ minHeight: '200px', color: '#111827' }}
        data-placeholder={placeholder}
        suppressContentEditableWarning={true}
      />

      {/* Placeholder styling */}
      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9CA3AF;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}