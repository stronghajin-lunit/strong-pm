export type PrdRunStatus = 'running' | 'done' | 'error'

export interface PrdRunRecord {
  id: string
  projectId: string
  projectName: string
  prdPageUrl: string
  requestedAt: string
  completedAt?: string
  status: PrdRunStatus
  confluenceUrl: string | null
  reflection?: string
}
