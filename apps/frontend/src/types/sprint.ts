export type RunStatus = 'running' | 'done' | 'error'

export interface SprintOption {
  sprintId: number
  sprintNumber: number
  label: string
  status: 'active' | 'closed' | 'future'
}

export interface SprintRunRecord {
  id: string
  sprintLabel: string
  requestedAt: string
  completedAt?: string
  status: RunStatus
  confluenceUrl: string | null
}
