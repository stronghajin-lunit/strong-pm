import type { Notification } from '@/types/notification'

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n-1',
    type: 'pr-review',
    title: 'Review requested',
    source: 'PR #234 — Auth refactor',
    time: '5m ago',
  },
  {
    id: 'n-2',
    type: 'mention',
    title: 'Mentioned in comment',
    source: 'RAD-045 · Sprint 14',
    time: '23m ago',
  },
  {
    id: 'n-3',
    type: 'deadline',
    title: 'Sprint ends tomorrow',
    source: 'Sprint 14 · Payment Module Refactor',
    time: '1h ago',
  },
  {
    id: 'n-4',
    type: 'task-done',
    title: 'Release note ready',
    source: 'AICP Monthly 26-03-01',
    time: '2h ago',
  },
  {
    id: 'n-5',
    type: 'alert',
    title: 'Deployment check needed',
    source: 'ODM Monthly 26-04-01',
    time: '3h ago',
  },
]
