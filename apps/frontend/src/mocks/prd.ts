import type { PrdRunRecord } from '@/types/prd'

export const MOCK_PRD_HISTORY: PrdRunRecord[] = [
  {
    id: 'prd-1',
    product: 'ODM',
    featureSummary: 'License field on Block registration form',
    prdPageUrl: 'https://lunit.atlassian.net/wiki/spaces/AIP/pages/123',
    requestedAt: '2026-04-10 11:20',
    status: 'done',
    confluenceUrl: 'https://lunit.atlassian.net/wiki/spaces/AIP/pages/123',
  },
  {
    id: 'prd-2',
    product: 'Annotation Admin',
    featureSummary: 'Multiple QC system for annotation review',
    prdPageUrl: 'https://lunit.atlassian.net/wiki/spaces/AIP/pages/456',
    requestedAt: '2026-03-28 09:05',
    status: 'done',
    confluenceUrl: 'https://lunit.atlassian.net/wiki/spaces/AIP/pages/456',
  },
]
