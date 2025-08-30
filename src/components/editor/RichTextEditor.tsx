'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

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
  const editorRef = useRef<HTMLDivElement>(null)

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
  ]

  return (
    <div className={`border border-gray-300 rounded-lg bg-white ${disabled ? 'opacity-50' : ''} ${className}`}>
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-2 flex flex-wrap gap-1">
        {toolbarButtons.map((button, index) => {
          if (button.command === 'separator') {
            return <div key={index} className="w-px bg-gray-300 mx-1 self-stretch" />
          }

          return (
            <button
              key={button.command}
              type="button"
              disabled={disabled}
              onClick={() => button.handler ? button.handler() : formatText(button.command)}
              className="px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded border border-transparent hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
        className="min-h-[200px] p-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
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