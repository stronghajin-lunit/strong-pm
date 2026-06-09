export interface SlackItem {
  id: number
  slackChannelId: string
  slackChannelName: string
  slackMessageTs: string
  slackMessageUrl: string
  senderName: string
  question: string
  answer: string
  answerDate: string
  aiProjectId: number | null
  linkedProjectId: number | null
  archived: boolean
}

export interface SlackItemListResponse {
  items: SlackItem[]
}

export interface SlackLastSyncedResponse {
  last_message_ts: string | null
}

export type SlackFilter = 'all' | 'unlinked' | 'linked' | 'archived'
