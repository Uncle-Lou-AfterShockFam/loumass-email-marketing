'use client'

import { useState, useEffect } from 'react'
import { Plus, Mail, Edit, Trash2, Copy, Code, Eye } from 'lucide-react'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  content: string
  category: string
  variables: string[]
  createdAt: string
  updatedAt: string
}

const TEMPLATE_CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'welcome', label: 'Welcome' },
  { value: 'promotional', label: 'Promotional' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'transactional', label: 'Transactional' },
  { value: 'follow-up', label: 'Follow Up' }
]

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null)
  
  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    content: '',
    category: 'general'
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates')
      if (res.ok) {
        const data = await res.json()
        // Ensure data is an array
        if (Array.isArray(data)) {
          setTemplates(data)
        } else {
          console.error('Templates API returned non-array:', data)
          setTemplates([])
        }
      } else {
        console.error('Templates API error:', res.status)
        setTemplates([])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }

  const saveTemplate = async () => {
    if (!templateForm.name || !templateForm.subject || !templateForm.content) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const url = editingTemplate
        ? `/api/templates/${editingTemplate.id}`
        : '/api/templates'
      
      const res = await fetch(url, {
        method: editingTemplate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateForm)
      })

      const data = await res.json()
      
      if (!res.ok) {
        if (data.errors) {
          alert('Template syntax errors:\\n' + data.errors.join('\\n'))
        } else {
          alert(data.error || 'Failed to save template')
        }
        return
      }

      await fetchTemplates()
      closeModal()
    } catch (error) {
      console.error('Error saving template:', error)
      alert('Failed to save template')
    }
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        await fetchTemplates()
      }
    } catch (error) {
      console.error('Error deleting template:', error)
    }
  }

  const duplicateTemplate = async (template: EmailTemplate) => {
    setTemplateForm({
      name: `${template.name} (Copy)`,
      subject: template.subject,
      content: template.content,
      category: template.category
    })
    setEditingTemplate(null)
    setShowTemplateModal(true)
  }

  const openModal = (template?: EmailTemplate) => {
    if (template) {
      setEditingTemplate(template)
      setTemplateForm({
        name: template.name,
        subject: template.subject,
        content: template.content,
        category: template.category
      })
    } else {
      setEditingTemplate(null)
      setTemplateForm({
        name: '',
        subject: '',
        content: '',
        category: 'general'
      })
    }
    setShowTemplateModal(true)
  }

  const closeModal = () => {
    setShowTemplateModal(false)
    setEditingTemplate(null)
    setTemplateForm({
      name: '',
      subject: '',
      content: '',
      category: 'general'
    })
  }

  const filteredTemplates = Array.isArray(templates) ? templates.filter(
    template => selectedCategory === 'all' || template.category === selectedCategory
  ) : []

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading templates...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Email Templates</h1>
          <p className="text-gray-600 mt-2">Create reusable templates with dynamic variables</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Template
        </button>
      </div>

      <div className="mb-6">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-lg ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Templates
          </button>
          {TEMPLATE_CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-3 py-1 rounded-lg ${
                selectedCategory === cat.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {filteredTemplates.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
          <p className="text-gray-500 mb-6">Create your first template to get started</p>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Create Your First Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded mt-1">
                      {TEMPLATE_CATEGORIES.find(c => c.value === template.category)?.label || template.category}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-3 line-clamp-1">
                  <strong>Subject:</strong> {template.subject}
                </p>

                <p className="text-sm text-gray-500 mb-4 line-clamp-3">
                  {template.content}
                </p>

                {template.variables.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {template.variables.slice(0, 3).map((variable, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded"
                        >
                          <Code className="w-3 h-3" />
                          {variable}
                        </span>
                      ))}
                      {template.variables.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{template.variables.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-500">
                    {formatDate(template.updatedAt)}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setPreviewTemplate(template)
                        setShowPreview(true)
                      }}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openModal(template)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => duplicateTemplate(template)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                      placeholder="e.g., Welcome Email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={templateForm.category}
                      onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    >
                      {TEMPLATE_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject Line *
                  </label>
                  <input
                    type="text"
                    value={templateForm.subject}
                    onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    placeholder="e.g., Welcome to {{contact.company || 'our platform'}}"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Content *
                  </label>
                  <textarea
                    value={templateForm.content}
                    onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm text-gray-900 bg-white"
                    rows={15}
                    placeholder="Hi {{contact.firstName || 'there'}},

Welcome to our platform!

{{if contact.plan === 'premium'}}
As a premium member, you get access to exclusive features...
{{else}}
Start exploring our features today...
{{/if}}

{{forEach contact.interests as interest}}
- We see you're interested in {{interest}}
{{/forEach}}

Best regards,
The Team"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Use {"{{variable}}"} for dynamic content, {"{{if condition}}...{{/if}}"} for conditionals,
                    {"{{forEach array as item}}...{{/forEach}}"} for loops
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveTemplate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Template Preview</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Template Name</label>
                  <p className="text-gray-900">{previewTemplate.name}</p>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
                  <p className="text-gray-900 font-mono text-sm bg-gray-50 p-2 rounded">
                    {previewTemplate.subject}
                  </p>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Content</label>
                  <pre className="text-gray-900 font-mono text-sm bg-gray-50 p-4 rounded whitespace-pre-wrap">
                    {previewTemplate.content}
                  </pre>
                </div>

                {previewTemplate.variables.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Variables Used</label>
                    <div className="flex flex-wrap gap-2">
                      {previewTemplate.variables.map((variable, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded"
                        >
                          <Code className="w-3 h-3" />
                          {variable}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowPreview(false)
                    setPreviewTemplate(null)
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}