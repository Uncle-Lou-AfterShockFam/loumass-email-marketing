interface TemplateVariable {
  name: string
  path: string
}

interface ProcessedTemplate {
  subject: string
  content: string
  variables: string[]
}

export class TemplateProcessor {
  /**
   * Process a template with contact data and variables
   * Supports:
   * - Basic variable replacement: {{contact.firstName}}
   * - Default values: {{contact.firstName || 'there'}}
   * - Conditionals: {{if condition}}...{{else}}...{{/if}}
   * - Loops: {{forEach items as item}}...{{/forEach}}
   * - API variables: {{variables.apiData.field}}
   */
  async process(
    template: { subject: string; content: string },
    contact: any,
    variables: Record<string, any> = {}
  ): Promise<ProcessedTemplate> {
    // Create a context that allows both {{contact.firstName}} and {{firstName}} formats
    const context = {
      contact,
      variables,
      ...variables, // Allow top-level access to variables
      // Add contact fields at root level for simpler syntax
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      email: contact.email || '',
      company: contact.company || '',
      phone: contact.phone || '',
      // Preserve nested access as well
    }

    const processedSubject = this.processString(template.subject, context)
    const processedContent = this.processString(template.content, context)
    const extractedVariables = this.extractVariables(template.content)

    return {
      subject: processedSubject,
      content: processedContent,
      variables: extractedVariables
    }
  }

  private processString(str: string, context: any): string {
    let result = str

    // Process conditionals first
    result = this.processConditionals(result, context)

    // Process loops
    result = this.processLoops(result, context)

    // Process variables
    result = this.processVariables(result, context)

    return result
  }

  private processConditionals(str: string, context: any): string {
    const conditionalRegex = /{{if\s+(.*?)}}([\s\S]*?)(?:{{else}}([\s\S]*?))?{{\/if}}/g

    return str.replace(conditionalRegex, (match, condition, trueBranch, falseBranch = '') => {
      try {
        const result = this.evaluateCondition(condition, context)
        return result ? trueBranch : falseBranch
      } catch (error) {
        console.error('Error evaluating condition:', condition, error)
        return falseBranch
      }
    })
  }

  private processLoops(str: string, context: any): string {
    const loopRegex = /{{forEach\s+(.*?)\s+as\s+(.*?)}}([\s\S]*?){{\/forEach}}/g

    return str.replace(loopRegex, (match, collection, itemName, loopContent) => {
      try {
        const items = this.resolveValue(collection, context)
        if (!Array.isArray(items)) return ''

        return items
          .map(item => {
            const loopContext = { ...context, [itemName]: item }
            return this.processVariables(loopContent, loopContext)
          })
          .join('')
      } catch (error) {
        console.error('Error processing loop:', collection, error)
        return ''
      }
    })
  }

  private processVariables(str: string, context: any): string {
    const variableRegex = /{{(.*?)}}/g

    return str.replace(variableRegex, (match, expression) => {
      // Skip if/forEach/else/end tags
      if (
        expression.startsWith('if ') ||
        expression.startsWith('forEach ') ||
        expression === 'else' ||
        expression.startsWith('/')
      ) {
        return match
      }

      try {
        // Handle default values (e.g., contact.firstName || 'there')
        if (expression.includes('||')) {
          const [primary, fallback] = expression.split('||').map((s: string) => s.trim())
          const value = this.resolveValue(primary, context)
          if (value !== null && value !== undefined && value !== '') {
            return String(value)
          }
          // Evaluate fallback (remove quotes if it's a string literal)
          const fallbackValue = fallback.replace(/^['"]|['"]$/g, '')
          return fallbackValue
        }

        // Simple variable resolution
        const value = this.resolveValue(expression, context)
        return value !== null && value !== undefined ? String(value) : ''
      } catch (error) {
        console.error('Error processing variable:', expression, error)
        return ''
      }
    })
  }

  private evaluateCondition(condition: string, context: any): boolean {
    try {
      // Handle simple equality checks (e.g., contact.plan === 'premium')
      const equalityMatch = condition.match(/(.+?)\s*===\s*['"](.+?)['"]/)
      if (equalityMatch) {
        const [, left, right] = equalityMatch
        const leftValue = this.resolveValue(left.trim(), context)
        return leftValue === right
      }

      // Handle inequality checks
      const inequalityMatch = condition.match(/(.+?)\s*!==\s*['"](.+?)['"]/)
      if (inequalityMatch) {
        const [, left, right] = inequalityMatch
        const leftValue = this.resolveValue(left.trim(), context)
        return leftValue !== right
      }

      // Handle numeric comparisons
      const comparisonMatch = condition.match(/(.+?)\s*([><=]+)\s*(.+)/)
      if (comparisonMatch) {
        const [, left, operator, right] = comparisonMatch
        const leftValue = Number(this.resolveValue(left.trim(), context))
        const rightValue = Number(this.resolveValue(right.trim(), context))

        switch (operator) {
          case '>':
            return leftValue > rightValue
          case '>=':
            return leftValue >= rightValue
          case '<':
            return leftValue < rightValue
          case '<=':
            return leftValue <= rightValue
          case '==':
          case '===':
            return leftValue === rightValue
          default:
            return false
        }
      }

      // Handle boolean/existence checks
      const value = this.resolveValue(condition, context)
      return Boolean(value)
    } catch (error) {
      console.error('Error evaluating condition:', condition, error)
      return false
    }
  }

  private resolveValue(path: string, context: any): any {
    const keys = path.split('.')
    let value = context

    for (const key of keys) {
      if (value === null || value === undefined) return null
      
      // Handle array indexing (e.g., items[0])
      const arrayMatch = key.match(/(.+?)\[(\d+)\]/)
      if (arrayMatch) {
        const [, arrayName, index] = arrayMatch
        value = value[arrayName]?.[parseInt(index)]
      } else {
        value = value[key]
      }
    }

    return value
  }

  extractVariables(content: string): string[] {
    const variables = new Set<string>()
    const variableRegex = /{{(.*?)}}/g
    let match

    while ((match = variableRegex.exec(content)) !== null) {
      const expression = match[1]
      
      // Skip control structures
      if (
        expression.startsWith('if ') ||
        expression.startsWith('forEach ') ||
        expression === 'else' ||
        expression.startsWith('/')
      ) {
        continue
      }

      // Extract the variable name (before any operators)
      const variableName = expression
        .split(/\s*\|\|\s*/)[0] // Split on ||
        .split(/\s*[><=!]+\s*/)[0] // Split on operators
        .trim()

      if (variableName) {
        variables.add(variableName)
      }
    }

    return Array.from(variables)
  }

  /**
   * Validate template syntax
   */
  validateTemplate(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check for balanced if/endif
    const ifCount = (content.match(/{{if\s+/g) || []).length
    const endIfCount = (content.match(/{{\/if}}/g) || []).length
    if (ifCount !== endIfCount) {
      errors.push(`Unbalanced if statements: ${ifCount} if(s), ${endIfCount} /if(s)`)
    }

    // Check for balanced forEach/endForEach
    const forEachCount = (content.match(/{{forEach\s+/g) || []).length
    const endForEachCount = (content.match(/{{\/forEach}}/g) || []).length
    if (forEachCount !== endForEachCount) {
      errors.push(`Unbalanced forEach loops: ${forEachCount} forEach(s), ${endForEachCount} /forEach(s)`)
    }

    // Check for valid variable syntax
    const variableRegex = /{{(.*?)}}/g
    let match
    while ((match = variableRegex.exec(content)) !== null) {
      const expression = match[1]
      if (!expression.trim()) {
        errors.push(`Empty variable at position ${match.index}`)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}