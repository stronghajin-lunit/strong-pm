export type JiraTicketType = 'Task' | 'Bug'
export type JiraTicketRunStatus = 'running' | 'done' | 'error'

export type JiraProduct = 'ODM' | 'Annotation Admin' | 'Annotation Tool'

export interface JiraTicketRunRecord {
  id: string
  summary: string
  product: JiraProduct
  sprint: string
  type: JiraTicketType
  requestedAt: string
  status: JiraTicketRunStatus
  jiraUrl: string | null
}
