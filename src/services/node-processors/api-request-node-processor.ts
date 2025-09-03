interface ApiRequestNodeData {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  body?: string
  variableName: string
  timeout?: number
}

interface ProcessResult {
  completed: boolean
  failed?: boolean
  error?: string
  executionData?: any
  waitUntil?: Date
  branch?: string
}

export class ApiRequestNodeProcessor {
  async process(execution: any, nodeData: ApiRequestNodeData): Promise<ProcessResult> {
    try {
      if (!nodeData.url || !nodeData.method || !nodeData.variableName) {
        return {
          completed: false,
          failed: true,
          error: 'URL, method, and variable name are required'
        }
      }

      // Process URL and body with template variables
      const processedUrl = this.processTemplate(nodeData.url, execution)
      const processedBody = nodeData.body ? this.processTemplate(nodeData.body, execution) : undefined

      const response = await this.makeHttpRequest({
        url: processedUrl,
        method: nodeData.method,
        headers: nodeData.headers || {},
        body: processedBody,
        timeout: nodeData.timeout || 30000
      })

      // Store response in execution data
      const executionData = execution.executionData || {}
      const variables = executionData.variables || {}

      const updatedExecutionData = {
        ...executionData,
        variables: {
          ...variables,
          [nodeData.variableName]: {
            status: response.status,
            statusText: response.statusText,
            data: response.data,
            headers: response.headers,
            timestamp: new Date().toISOString()
          }
        }
      }

      return {
        completed: true,
        executionData: updatedExecutionData
      }

    } catch (error) {
      console.error('Error in API request node processor:', error)
      
      // Store error in variables for debugging
      const executionData = execution.executionData || {}
      const variables = executionData.variables || {}

      const updatedExecutionData = {
        ...executionData,
        variables: {
          ...variables,
          [nodeData.variableName]: {
            error: true,
            message: error instanceof Error ? error.message : 'Unknown API error',
            timestamp: new Date().toISOString()
          }
        }
      }

      return {
        completed: false,
        failed: true,
        error: error instanceof Error ? error.message : 'Unknown API request error',
        executionData: updatedExecutionData
      }
    }
  }

  private async makeHttpRequest(config: {
    url: string
    method: string
    headers: Record<string, string>
    body?: string
    timeout: number
  }): Promise<{
    status: number
    statusText: string
    data: any
    headers: Record<string, string>
  }> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config.timeout)

    try {
      const fetchConfig: RequestInit = {
        method: config.method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LOUMASS/1.0',
          ...config.headers
        },
        signal: controller.signal
      }

      // Add body for methods that support it
      if (config.body && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
        fetchConfig.body = config.body
      }

      const response = await fetch(config.url, fetchConfig)
      
      clearTimeout(timeoutId)

      // Parse response data
      let responseData: any
      const contentType = response.headers.get('content-type') || ''
      
      if (contentType.includes('application/json')) {
        try {
          responseData = await response.json()
        } catch {
          responseData = await response.text()
        }
      } else {
        responseData = await response.text()
      }

      // Convert headers to plain object
      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      return {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
        headers: responseHeaders
      }

    } finally {
      clearTimeout(timeoutId)
    }
  }

  private processTemplate(template: string, execution: any): string {
    let processed = template

    // Replace contact variables
    const contact = execution.contact || {}
    processed = processed.replace(/\{\{contact\.([^}]+)\}\}/g, (match, field) => {
      const value = this.getNestedValue(contact, field)
      return value !== null && value !== undefined ? String(value) : match
    })

    // Replace execution variables
    const executionData = execution.executionData || {}
    const variables = executionData.variables || {}
    
    processed = processed.replace(/\{\{variables\.([^}]+)\}\}/g, (match, path) => {
      const value = this.getNestedValue(variables, path)
      return value !== null && value !== undefined ? String(value) : match
    })

    // Replace automation variables
    const automation = execution.automation || {}
    processed = processed.replace(/\{\{automation\.([^}]+)\}\}/g, (match, field) => {
      const value = this.getNestedValue(automation, field)
      return value !== null && value !== undefined ? String(value) : match
    })

    return processed
  }

  private getNestedValue(obj: any, path: string): any {
    if (!obj || !path) return null
    
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? current[key] : null
    }, obj)
  }
}