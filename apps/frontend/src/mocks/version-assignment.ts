import type { JiraTicket, JiraVersion } from '@/types/version-assignment'

export const MOCK_JIRA_VERSIONS: JiraVersion[] = [
  { id: 'v1', name: 'ODM Hotfix 26-04-30', releaseDate: '2026-04-30' },
  { id: 'v2', name: 'ODM Monthly 26-05-06', releaseDate: '2026-05-06' },
  { id: 'v3', name: 'ODM Monthly 26-06-03', releaseDate: '2026-06-03' },
  { id: 'v4', name: 'ODM Monthly 26-07-01', releaseDate: '2026-07-01' },
]

export const MOCK_UNVERSIONED_TICKETS: JiraTicket[] = [
  {
    id: 'RAD-9401',
    summary: 'Implement payment gateway integration',
    epicId: 'RAD-9300',
    epicName: 'Payment Module Refactor',
    status: 'In Progress',
    currentVersion: null,
  },
  {
    id: 'RAD-9402',
    summary: 'Add retry logic for failed transactions',
    epicId: 'RAD-9300',
    epicName: 'Payment Module Refactor',
    status: 'Done',
    currentVersion: null,
  },
  {
    id: 'RAD-9403',
    summary: 'Write unit tests for payment service',
    epicId: 'RAD-9300',
    epicName: 'Payment Module Refactor',
    status: 'To Do',
    currentVersion: null,
  },
  {
    id: 'RAD-9444',
    summary: 'Fix token refresh race condition',
    epicId: 'RAD-9400',
    epicName: 'Auth System Upgrade',
    status: 'Done',
    currentVersion: null,
  },
  {
    id: 'RAD-9450',
    summary: 'Update OAuth2 scope definitions',
    epicId: 'RAD-9400',
    epicName: 'Auth System Upgrade',
    status: 'In Review',
    currentVersion: null,
  },
  {
    id: 'RAD-9451',
    summary: 'Migrate legacy session handling',
    epicId: 'RAD-9400',
    epicName: 'Auth System Upgrade',
    status: 'To Do',
    currentVersion: null,
  },
  {
    id: 'RAD-9999',
    summary: 'Hotfix: null pointer in dashboard widget',
    epicId: null,
    epicName: null,
    status: 'Done',
    currentVersion: null,
  },
  {
    id: 'RAD-9998',
    summary: 'Update dependencies to latest stable',
    epicId: null,
    epicName: null,
    status: 'To Do',
    currentVersion: null,
  },
]
