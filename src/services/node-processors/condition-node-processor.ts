interface ConditionNodeData {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'exists' | 'not_exists' | 'in' | 'not_in'
  value: string | number | string[]
  dataSource: 'contact' | 'variable' | 'static'
}

interface ProcessResult {
  completed: boolean
  failed?: boolean
  error?: string
  executionData?: any
  waitUntil?: Date
  branch?: string
}

export class ConditionNodeProcessor {
  async process(execution: any, nodeData: ConditionNodeData): Promise<ProcessResult> {
    try {
      const actualValue = this.getActualValue(execution, nodeData.field, nodeData.dataSource)
      const conditionMet = this.evaluateCondition(actualValue, nodeData.operator, nodeData.value)

      return {
        completed: true,
        branch: conditionMet ? 'true' : 'false'
      }

    } catch (error) {
      console.error('Error in condition node processor:', error)
      
      return {
        completed: false,
        failed: true,
        error: error instanceof Error ? error.message : 'Unknown condition error'
      }
    }
  }

  private getActualValue(execution: any, field: string, dataSource: string): any {
    switch (dataSource) {
      case 'contact':
        return this.getNestedValue(execution.contact, field)
      
      case 'variable':
        const executionData = execution.executionData || {}
        const variables = executionData.variables || {}
        return this.getNestedValue(variables, field)
      
      case 'static':
        return field
      
      default:
        return null
    }
  }

  private getNestedValue(obj: any, path: string): any {
    if (!obj || !path) return null
    
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? current[key] : null
    }, obj)
  }

  private evaluateCondition(actualValue: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return this.normalizeValue(actualValue) === this.normalizeValue(expectedValue)
      
      case 'not_equals':
        return this.normalizeValue(actualValue) !== this.normalizeValue(expectedValue)
      
      case 'contains':
        if (typeof actualValue === 'string' && typeof expectedValue === 'string') {
          return actualValue.toLowerCase().includes(expectedValue.toLowerCase())
        }
        if (Array.isArray(actualValue)) {
          return actualValue.includes(expectedValue)
        }
        return false
      
      case 'not_contains':
        if (typeof actualValue === 'string' && typeof expectedValue === 'string') {
          return !actualValue.toLowerCase().includes(expectedValue.toLowerCase())
        }
        if (Array.isArray(actualValue)) {
          return !actualValue.includes(expectedValue)
        }
        return true
      
      case 'greater_than':
        const numActual = this.toNumber(actualValue)
        const numExpected = this.toNumber(expectedValue)
        return numActual !== null && numExpected !== null && numActual > numExpected
      
      case 'less_than':
        const numActual2 = this.toNumber(actualValue)
        const numExpected2 = this.toNumber(expectedValue)
        return numActual2 !== null && numExpected2 !== null && numActual2 < numExpected2
      
      case 'exists':
        return actualValue !== null && actualValue !== undefined && actualValue !== ''
      
      case 'not_exists':
        return actualValue === null || actualValue === undefined || actualValue === ''
      
      case 'in':
        if (Array.isArray(expectedValue)) {
          return expectedValue.includes(actualValue)
        }
        return false
      
      case 'not_in':
        if (Array.isArray(expectedValue)) {
          return !expectedValue.includes(actualValue)
        }
        return true
      
      default:
        return false
    }
  }

  private normalizeValue(value: any): any {
    if (typeof value === 'string') {
      return value.toLowerCase().trim()
    }
    return value
  }

  private toNumber(value: any): number | null {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const num = parseFloat(value)
      return isNaN(num) ? null : num
    }
    return null
  }
}