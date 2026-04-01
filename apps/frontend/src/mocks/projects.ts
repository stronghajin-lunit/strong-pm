import type { Project } from '@/types/project'

export const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    name: 'Payment Module Refactor',
    description:
      'Full refactor of PG integration and payment flow. PRD complete, TP tracking in progress.',
    status: 'active',
    emoji: '💳',
    progress: 58,
    updatedAt: '2h ago',
  },
  {
    id: '2',
    name: 'Auth System Redesign',
    description: 'Full OAuth2 auth system redesign. Kickoff agent Q&A in progress.',
    status: 'planning',
    emoji: '🔐',
    progress: 12,
    updatedAt: '1d ago',
  },
  {
    id: '3',
    name: 'Dashboard v2',
    description: 'Analytics dashboard v2 shipped. Release note and retrospective complete.',
    status: 'done',
    emoji: '📊',
    progress: 100,
    updatedAt: '3w ago',
  },
]
