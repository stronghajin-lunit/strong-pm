import type { JiraProduct } from '@/types/jira-ticket'

export interface JiraSprintOption {
  id: string
  label: string
}

export const MOCK_JIRA_SPRINTS: Record<JiraProduct, JiraSprintOption[]> = {
  ODM: [
    { id: 'odm-79', label: 'Onco Sprint 79' },
    { id: 'odm-78', label: 'Onco Sprint 78' },
    { id: 'odm-77', label: 'Onco Sprint 77' },
    { id: 'odm-76', label: 'Onco Sprint 76' },
    { id: 'odm-75', label: 'Onco Sprint 75' },
  ],
  'Annotation Admin': [
    { id: 'aa-34', label: 'Onco Sprint 34' },
    { id: 'aa-33', label: 'Onco Sprint 33' },
    { id: 'aa-32', label: 'Onco Sprint 32' },
    { id: 'aa-31', label: 'Onco Sprint 31' },
  ],
  'Annotation Tool': [
    { id: 'at-21', label: 'Onco Sprint 21' },
    { id: 'at-20', label: 'Onco Sprint 20' },
    { id: 'at-19', label: 'Onco Sprint 19' },
    { id: 'at-18', label: 'Onco Sprint 18' },
  ],
}
