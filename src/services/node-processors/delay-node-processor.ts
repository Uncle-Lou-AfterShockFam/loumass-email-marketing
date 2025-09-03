interface DelayNodeData {
  delayType: 'minutes' | 'hours' | 'days' | 'weeks'
  delayValue: number
}

interface ProcessResult {
  completed: boolean
  failed?: boolean
  error?: string
  executionData?: any
  waitUntil?: Date
  branch?: string
}

export class DelayNodeProcessor {
  async process(execution: any, nodeData: DelayNodeData): Promise<ProcessResult> {
    try {
      if (!nodeData.delayValue || nodeData.delayValue <= 0) {
        // No delay, continue immediately
        return {
          completed: true
        }
      }

      // Calculate delay time
      const now = new Date()
      let delayInMs = 0

      switch (nodeData.delayType) {
        case 'minutes':
          delayInMs = nodeData.delayValue * 60 * 1000
          break
        case 'hours':
          delayInMs = nodeData.delayValue * 60 * 60 * 1000
          break
        case 'days':
          delayInMs = nodeData.delayValue * 24 * 60 * 60 * 1000
          break
        case 'weeks':
          delayInMs = nodeData.delayValue * 7 * 24 * 60 * 60 * 1000
          break
        default:
          return {
            completed: false,
            failed: true,
            error: `Invalid delay type: ${nodeData.delayType}`
          }
      }

      const waitUntil = new Date(now.getTime() + delayInMs)

      return {
        completed: false,
        waitUntil
      }

    } catch (error) {
      console.error('Error in delay node processor:', error)
      
      return {
        completed: false,
        failed: true,
        error: error instanceof Error ? error.message : 'Unknown delay error'
      }
    }
  }
}