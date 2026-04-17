import type { PullRequest } from '@/types/pr'

export const MOCK_PRS: PullRequest[] = [
  {
    id: 'pr-1',
    title: 'feat/payment-gateway: Add PG integration API',
    description: 'KG Inicis & TossPayments endpoints, webhook handler',
    repo: 'backend',
    date: 'Today 13:42',
    author: { login: 'stronghajin', avatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4' },
    linkedProjectId: '1',
  },
  {
    id: 'pr-2',
    title: 'fix/refund-flow: Fix partial refund amount calc',
    description: 'Decimal rounding bug, per-currency handling added',
    repo: 'backend',
    date: 'Today 11:18',
    author: { login: 'dev-john', avatarUrl: 'https://avatars.githubusercontent.com/u/2?v=4' },
    linkedProjectId: '1',
  },
  {
    id: 'pr-3',
    title: 'feat/oauth2-token: Access/Refresh token issuance',
    description: 'JWT-based token issuance, Redis refresh token store',
    repo: 'auth-service',
    date: 'Yesterday 17:05',
    author: { login: 'sarah-k', avatarUrl: 'https://avatars.githubusercontent.com/u/3?v=4' },
    linkedProjectId: '2',
  },
  {
    id: 'pr-4',
    title: 'chore/deps: Upgrade Node 18 → 20',
    description: 'Runtime version upgrade, CI pipeline update',
    repo: 'frontend',
    date: 'Yesterday 14:33',
    author: { login: 'mike-dev', avatarUrl: 'https://avatars.githubusercontent.com/u/4?v=4' },
    linkedProjectId: null,
  },
]
