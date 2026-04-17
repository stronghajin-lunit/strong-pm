export interface SprintOption {
  id: string
  label: string
  projectName: string
  status: 'active' | 'done'
}

export type RunStatus = 'running' | 'done' | 'error'

export interface SprintRunRecord {
  id: string
  sprintLabel: string
  projectName: string
  requestedAt: string
  status: RunStatus
  confluenceUrl: string | null
}
