export type QueueStatus = 'running' | 'queued' | 'done' | 'error'

export type QueueTool =
  | 'sprint-report'
  | 'release-note'
  | 'prd'
  | 'jira-ticket'
  | 'deployment'

export interface QueueItem {
  id: string
  tool: QueueTool
  toolLabel: string
  subject: string
  status: QueueStatus
  requestedAt: string
}
