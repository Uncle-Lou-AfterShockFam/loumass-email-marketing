'use client'

import React, { useState, useRef, useEffect } from 'react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  variables?: Array<{ name: string; value: string }>
}

export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = 'Write your content here...',
  variables = []
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [showVariables, setShowVariables] = useState(false)
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')
  const [selectedText, setSelectedText] = useState('')

  // Initialize content
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value
    }
  }, [value])

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    handleInput()
  }

  const insertVariable = (variable: string) => {
    const variableHtml = `<span class="variable-tag" contenteditable="false" style="background-color: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; font-size: 14px;">{{${variable}}}</span>&nbsp;`
    execCommand('insertHTML', variableHtml)
    setShowVariables(false)
  }

  const handleLinkClick = () => {
    const selection = window.getSelection()
    if (selection && selection.toString()) {
      setSelectedText(selection.toString())
      setLinkText(selection.toString())
      setIsLinkModalOpen(true)
    } else {
      alert('Please select some text first')
    }
  }

  const insertLink = () => {
    if (linkUrl && linkText) {
      const linkHtml = `<a href="${linkUrl}" style="color: #2563eb; text-decoration: underline;">${linkText}</a>`
      execCommand('insertHTML', linkHtml)
      setIsLinkModalOpen(false)
      setLinkUrl('')
      setLinkText('')
    }
  }

  const commonVariables = [
    { name: 'firstName', value: 'First Name' },
    { name: 'lastName', value: 'Last Name' },
    { name: 'email', value: 'Email' },
    { name: 'company', value: 'Company' },
  ]

  const allVariables = [...commonVariables, ...variables]

  return (
    <div className="rich-text-editor">
      {/* Toolbar */}
      <div className="border border-gray-300 rounded-t-lg bg-gray-50 p-2 flex items-center gap-1 flex-wrap">
        {/* Text formatting */}
        <button
          type="button"
          onClick={() => execCommand('bold')}
          className="px-3 py-1 rounded hover:bg-gray-200 font-bold"
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => execCommand('italic')}
          className="px-3 py-1 rounded hover:bg-gray-200 italic"
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => execCommand('underline')}
          className="px-3 py-1 rounded hover:bg-gray-200 underline"
          title="Underline"
        >
          U
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1" />
        
        {/* Lists */}
        <button
          type="button"
          onClick={() => execCommand('insertUnorderedList')}
          className="px-3 py-1 rounded hover:bg-gray-200"
          title="Bullet List"
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => execCommand('insertOrderedList')}
          className="px-3 py-1 rounded hover:bg-gray-200"
          title="Numbered List"
        >
          1. List
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1" />
        
        {/* Link */}
        <button
          type="button"
          onClick={handleLinkClick}
          className="px-3 py-1 rounded hover:bg-gray-200 text-blue-600"
          title="Insert Link"
        >
          🔗 Link
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1" />
        
        {/* Variables */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowVariables(!showVariables)}
            className="px-3 py-1 rounded hover:bg-gray-200 text-purple-600"
            title="Insert Variable"
          >
            {'{{ }}'} Variable
          </button>
          
          {showVariables && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-[200px]">
              <div className="p-2">
                <div className="text-xs font-semibold text-gray-600 mb-2">Insert Variable</div>
                {allVariables.map((variable) => (
                  <button
                    key={variable.name}
                    type="button"
                    onClick={() => insertVariable(variable.name)}
                    className="block w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                  >
                    <span className="text-purple-600">{`{{${variable.name}}}`}</span>
                    <span className="text-gray-500 ml-2 text-xs">{variable.value}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="min-h-[200px] p-3 border border-t-0 border-gray-300 rounded-b-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        style={{ lineHeight: '1.6' }}
        data-placeholder={placeholder}
        suppressContentEditableWarning={true}
      />
      
      {/* Link Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Insert Link</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link Text
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setIsLinkModalOpen(false)
                  setLinkUrl('')
                  setLinkText('')
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={insertLink}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Insert Link
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .rich-text-editor [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
          display: block;
        }
        
        .rich-text-editor .variable-tag {
          user-select: none;
          cursor: default;
        }
      `}</style>
    </div>
  )
}