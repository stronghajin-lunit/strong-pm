import type { SprintOption, SprintRunRecord } from '@/types/sprint'

export const MOCK_SPRINT_OPTIONS: SprintOption[] = [
  { id: 'sp-14', label: 'Sprint 14', projectName: 'Payment Module Refactor', status: 'active' },
  { id: 'sp-13', label: 'Sprint 13', projectName: 'Payment Module Refactor', status: 'done' },
  { id: 'sp-4',  label: 'Sprint 4',  projectName: 'Auth System Redesign',    status: 'active' },
  { id: 'sp-3',  label: 'Sprint 3',  projectName: 'Auth System Redesign',    status: 'done'   },
  { id: 'sp-22', label: 'Sprint 22', projectName: 'Dashboard v2',            status: 'done'   },
]

export const MOCK_SPRINT_RUN_HISTORY: SprintRunRecord[] = [
  {
    id: 'run-1',
    sprintLabel: 'Sprint 13',
    projectName: 'Payment Module Refactor',
    requestedAt: '2026-03-24 11:20',
    status: 'done',
    confluenceUrl: '#',
  },
  {
    id: 'run-2',
    sprintLabel: 'Sprint 3',
    projectName: 'Auth System Redesign',
    requestedAt: '2026-03-14 16:05',
    status: 'done',
    confluenceUrl: '#',
  },
]
