import type { PrdRunRecord } from '@/types/prd'

export const MOCK_PRD_HISTORY: PrdRunRecord[] = [
  {
    id: 'prd-1',
    projectId: '1',
    projectName: 'Payment Module Refactor',
    prdPageUrl: 'https://lunit.atlassian.net/wiki/spaces/AIP/pages/123',
    requestedAt: '2026-04-10 11:20',
    completedAt: '2026-04-10 11:24',
    status: 'done',
    confluenceUrl: 'https://lunit.atlassian.net/wiki/spaces/AIP/pages/123',
    reflection: '§4.2 환불 정책 소수점 처리 규칙 추가. Background 섹션 용어 통일 필요.',
  },
  {
    id: 'prd-2',
    projectId: '2',
    projectName: 'Auth System Redesign',
    prdPageUrl: 'https://lunit.atlassian.net/wiki/spaces/AIP/pages/456',
    requestedAt: '2026-03-28 09:05',
    completedAt: '2026-03-28 09:09',
    status: 'done',
    confluenceUrl: 'https://lunit.atlassian.net/wiki/spaces/AIP/pages/456',
  },
]
