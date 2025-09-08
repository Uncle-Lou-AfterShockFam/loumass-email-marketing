'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, FileText, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function ImportContactsPage() {
  const router = useRouter()
  const [importing, setImporting] = useState(false)
  const [csvData, setCsvData] = useState('')
  const [fileError, setFileError] = useState('')

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setFileError('Please upload a CSV file')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setCsvData(text)
      setFileError('')
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!csvData.trim()) {
      toast.error('Please upload a CSV file or paste data')
      return
    }

    setImporting(true)
    try {
      const response = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData })
      })

      if (!response.ok) throw new Error('Import failed')

      const result = await response.json()
      toast.success(`Successfully imported ${result.imported} contacts`)
      router.push('/dashboard/contacts')
    } catch (error) {
      toast.error('Failed to import contacts')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Import Contacts</h1>
        <p className="text-muted-foreground mt-2">
          Import contacts from a CSV file or paste data directly
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>CSV Import</CardTitle>
          <CardDescription>
            Upload a CSV file with columns: email, firstName, lastName, company, phone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="file-upload">Upload CSV File</Label>
            <div className="flex items-center gap-4">
              <input
                id="file-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={importing}
              >
                <Upload className="mr-2 h-4 w-4" />
                Choose File
              </Button>
              {csvData && (
                <span className="text-sm text-muted-foreground">
                  <FileText className="inline mr-1 h-4 w-4" />
                  File loaded
                </span>
              )}
            </div>
            {fileError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{fileError}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="csv-data">Or Paste CSV Data</Label>
            <Textarea
              id="csv-data"
              placeholder="email,firstName,lastName,company,phone
john@example.com,John,Doe,Acme Inc,555-0100
jane@example.com,Jane,Smith,Tech Corp,555-0200"
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
              disabled={importing}
            />
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              First row should contain column headers. Required: email. 
              Optional: firstName, lastName, company, phone
            </AlertDescription>
          </Alert>

          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/contacts')}
              disabled={importing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing || !csvData.trim()}
            >
              {importing ? 'Importing...' : 'Import Contacts'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}