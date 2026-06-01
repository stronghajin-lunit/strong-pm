export type NotificationType = 'pr-review' | 'mention' | 'deadline' | 'task-done' | 'alert'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  source: string
  time: string
}
