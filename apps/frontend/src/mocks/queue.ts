import type { QueueItem } from '@/types/queue'

export const MOCK_QUEUE: QueueItem[] = [
  {
    id: 'q-1',
    tool: 'sprint-report',
    toolLabel: 'Sprint Report Creator',
    subject: 'Sprint 14 · Payment Module Refactor',
    status: 'running',
    requestedAt: '2026-04-19 10:02',
  },
  {
    id: 'q-2',
    tool: 'release-note',
    toolLabel: 'Release Note Creator',
    subject: 'AICP Monthly 26-04-01',
    status: 'queued',
    requestedAt: '2026-04-19 10:05',
  },
  {
    id: 'q-3',
    tool: 'prd',
    toolLabel: 'PRD Writer',
    subject: 'Real-time collaboration feature',
    status: 'queued',
    requestedAt: '2026-04-19 10:11',
  },
]
