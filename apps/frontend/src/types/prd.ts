export type PrdRunStatus = 'running' | 'done' | 'error'

export interface PrdRunRecord {
  id: string
  product: string
  featureSummary: string
  prdPageUrl: string
  requestedAt: string
  status: PrdRunStatus
  confluenceUrl: string | null
}
