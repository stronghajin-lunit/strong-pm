import type { JiraTicketRunRecord } from '@/types/jira-ticket'

export const MOCK_JIRA_TICKET_HISTORY: JiraTicketRunRecord[] = [
  {
    id: 'jt-1',
    summary: 'ODM > UI + API Integration > Add license field to Block registration',
    product: 'ODM',
    sprint: 'Onco Sprint 77',
    type: 'Task',
    requestedAt: '2026-04-11 10:15',
    status: 'done',
    jiraUrl: 'https://lunit.atlassian.net/browse/RAD-9400',
  },
  {
    id: 'jt-2',
    summary: 'Annotation Admin > UI > Update the Job List Page filter',
    product: 'Annotation Admin',
    sprint: 'Onco Sprint 76',
    type: 'Task',
    requestedAt: '2026-04-02 14:30',
    status: 'done',
    jiraUrl: 'https://lunit.atlassian.net/browse/RAD-9350',
  },
  {
    id: 'jt-3',
    summary: 'ODM > UI > Slide filter does not work',
    product: 'ODM',
    sprint: 'Onco Sprint 76',
    type: 'Bug',
    requestedAt: '2026-04-01 16:00',
    status: 'error',
    jiraUrl: null,
  },
]
