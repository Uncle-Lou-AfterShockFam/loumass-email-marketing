'use client'

import { useState, useRef } from 'react'

interface ImportContactsModalProps {
  onClose: () => void
  onImport: (data: any) => void
}

export default function ImportContactsModal({ onClose, onImport }: ImportContactsModalProps) {
  const [importType, setImportType] = useState<'csv' | 'xlsx' | 'manual'>('csv')
  const [file, setFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<string[][]>([])
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({})
  const [manualContacts, setManualContacts] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const availableFields = [
    'email',
    'firstName', 
    'lastName',
    'company',
    'title',
    'phone',
    'tags'
  ]

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    
    // Preview CSV content
    if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        const rows = text.split('\n').map(row => row.split(',').map(cell => cell.trim().replace(/"/g, '')))
        setCsvPreview(rows.slice(0, 6)) // Show first 6 rows for preview
        setStep('mapping')
      }
      reader.readAsText(selectedFile)
    }
  }

  const handleFieldMapping = (csvColumn: number, field: string) => {
    setFieldMappings(prev => ({
      ...prev,
      [csvColumn]: field
    }))
  }

  const handleImport = async () => {
    setIsProcessing(true)
    
    try {
      let contactsData = []

      if (importType === 'manual') {
        // Parse manual input (one email per line)
        const emails = manualContacts.split('\n').filter(email => email.trim())
        contactsData = emails.map(email => ({ email: email.trim() }))
      } else if (file && csvPreview.length > 0) {
        // Process CSV with field mappings
        const [headers, ...dataRows] = csvPreview
        contactsData = dataRows.map(row => {
          const contact: any = {}
          Object.entries(fieldMappings).forEach(([columnIndex, fieldName]) => {
            if (fieldName && row[parseInt(columnIndex)]) {
              contact[fieldName] = row[parseInt(columnIndex)]
            }
          })
          return contact
        })
      }

      // Simulate import process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      onImport({
        type: importType,
        count: contactsData.length,
        contacts: contactsData
      })
      
    } catch (error) {
      console.error('Import failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Import Contacts
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Import Type Selection */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div>
                <label className="text-base font-medium text-gray-900">
                  Choose import method
                </label>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center">
                    <input
                      id="csv-import"
                      type="radio"
                      name="import-type"
                      value="csv"
                      checked={importType === 'csv'}
                      onChange={(e) => setImportType(e.target.value as 'csv')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <label htmlFor="csv-import" className="ml-3 block text-sm font-medium text-gray-700">
                      Upload CSV File
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="xlsx-import"
                      type="radio"
                      name="import-type"
                      value="xlsx"
                      checked={importType === 'xlsx'}
                      onChange={(e) => setImportType(e.target.value as 'xlsx')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <label htmlFor="xlsx-import" className="ml-3 block text-sm font-medium text-gray-700">
                      Upload Excel File
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="manual-import"
                      type="radio"
                      name="import-type"
                      value="manual"
                      checked={importType === 'manual'}
                      onChange={(e) => setImportType(e.target.value as 'manual')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <label htmlFor="manual-import" className="ml-3 block text-sm font-medium text-gray-700">
                      Enter Manually
                    </label>
                  </div>
                </div>
              </div>

              {/* File Upload */}
              {(importType === 'csv' || importType === 'xlsx') && (
                <div>
                  <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                        >
                          <span>Upload a file</span>
                          <input
                            id="file-upload"
                            ref={fileInputRef}
                            type="file"
                            accept={importType === 'csv' ? '.csv' : '.xlsx,.xls'}
                            onChange={handleFileSelect}
                            className="sr-only"
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {importType === 'csv' ? 'CSV' : 'Excel'} up to 10MB
                      </p>
                    </div>
                  </div>
                  {file && (
                    <div className="mt-2 text-sm text-gray-600">
                      Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>
              )}

              {/* Manual Input */}
              {importType === 'manual' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter email addresses (one per line)
                  </label>
                  <textarea
                    value={manualContacts}
                    onChange={(e) => setManualContacts(e.target.value)}
                    rows={8}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="john@example.com&#10;sarah@company.com&#10;mike@startup.io"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    {manualContacts.split('\n').filter(line => line.trim()).length} contacts entered
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Field Mapping */}
          {step === 'mapping' && csvPreview.length > 0 && (
            <div className="space-y-6">
              <div>
                <h4 className="text-base font-medium text-gray-900 mb-4">
                  Map CSV columns to contact fields
                </h4>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          CSV Column
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sample Data
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Map to Field
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {csvPreview[0]?.map((header, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            Column {index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="space-y-1">
                              {csvPreview.slice(1, 4).map((row, rowIndex) => (
                                <div key={rowIndex} className="text-xs">
                                  {row[index] || '—'}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={fieldMappings[index] || ''}
                              onChange={(e) => handleFieldMapping(index, e.target.value)}
                              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                            >
                              <option value="">Don't import</option>
                              {availableFields.map(field => (
                                <option key={field} value={field}>
                                  {field.charAt(0).toUpperCase() + field.slice(1)}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('preview')}
                  disabled={Object.keys(fieldMappings).length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Preview Import
                </button>
              </div>
            </div>
          )}

          {/* Import Preview */}
          {step === 'preview' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-base font-medium text-gray-900 mb-4">
                  Import Preview
                </h4>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">
                    <p>Ready to import <span className="font-medium">{csvPreview.length - 1}</span> contacts</p>
                    <p className="mt-1">Fields mapped: {Object.values(fieldMappings).filter(Boolean).length}</p>
                  </div>
                </div>

                {/* Sample preview */}
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Sample contacts:</h5>
                  <div className="space-y-2">
                    {csvPreview.slice(1, 4).map((row, index) => {
                      const contact: any = {}
                      Object.entries(fieldMappings).forEach(([columnIndex, fieldName]) => {
                        if (fieldName && row[parseInt(columnIndex)]) {
                          contact[fieldName] = row[parseInt(columnIndex)]
                        }
                      })
                      
                      return (
                        <div key={index} className="text-xs bg-white p-2 rounded border">
                          {Object.entries(contact).map(([field, value]) => (
                            <span key={field} className="inline-block mr-4">
                              <span className="text-gray-500">{field}:</span> {value as string}
                            </span>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep('mapping')}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Back to Mapping
                </button>
                <button
                  onClick={handleImport}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isProcessing ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Importing...
                    </div>
                  ) : (
                    'Import Contacts'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Manual Import Actions */}
          {importType === 'manual' && step === 'upload' && (
            <div className="flex justify-end mt-6">
              <button
                onClick={handleImport}
                disabled={!manualContacts.trim() || isProcessing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isProcessing ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Importing...
                  </div>
                ) : (
                  'Import Contacts'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}