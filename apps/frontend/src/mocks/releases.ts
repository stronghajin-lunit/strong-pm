import type {
  JiraVersionOption,
  ConfluenceFolderOption,
  ReleaseNoteRunRecord,
  DeploymentResult,
} from '@/types/release'

export const MOCK_CONFLUENCE_FOLDERS: ConfluenceFolderOption[] = [
  { id: 'default',      label: 'Default (Release Notes root)' },
  { id: 'aicp-2026',   label: 'AIP / AICP Release Notes / 2026' },
  { id: 'odm-2026',    label: 'AIP / ODM Release Notes / 2026'  },
  { id: 'aicp-2025',   label: 'AIP / AICP Release Notes / 2025' },
]

export const MOCK_RELEASE_NOTE_HISTORY: ReleaseNoteRunRecord[] = [
  {
    id: 'rn-1',
    jiraVersion: 'AICP Monthly 26-03-01',
    confluenceLocation: 'AIP / AICP Release Notes / 2026',
    requestedAt: '2026-03-21 14:02',
    status: 'done',
    confluenceUrl: '#',
  },
  {
    id: 'rn-2',
    jiraVersion: 'ODM Monthly 26-03-01',
    confluenceLocation: 'AIP / ODM Release Notes / 2026',
    requestedAt: '2026-03-05 09:30',
    status: 'done',
    confluenceUrl: '#',
  },
  {
    id: 'rn-3',
    jiraVersion: 'AICP Monthly 26-02-01',
    confluenceLocation: 'AIP / AICP Release Notes / 2026',
    requestedAt: '2026-02-28 16:30',
    status: 'error',
    confluenceUrl: null,
  },
]

// ─── Deployment Tracker ───────────────────────────────────────────────────────

export const MOCK_DT_VERSIONS: JiraVersionOption[] = [
  { id: 'aicp-0401', label: 'AICP Monthly 26-04-01' },
  { id: 'odm-0401',  label: 'ODM Monthly 26-04-01'  },
  { id: 'aicp-0301', label: 'AICP Monthly 26-03-01' },
  { id: 'odm-0301',  label: 'ODM Monthly 26-03-01'  },
]

export const MOCK_DT_DATA: Record<string, DeploymentResult> = {
  'aicp-0401': {
    title: 'AICP Monthly 26-04-01',
    stats: { total: 32, withPR: 26, noPR: 6, merged: 26, deployedThis: 24, deployedPrev: 2 },
    repos: [
      'scope-dp-console (v4.8.0)',
      'scope-annotation-tool-front (v4.7.0)',
      'scope-dp-annotation-manager (v3.8.0)',
    ],
    noPRTickets: ['RAD-9372', 'RAD-9362', 'RAD-9344', 'RAD-9343', 'RAD-9337', 'RAD-9218'],
    unregisteredPRs: {
      count: 5,
      tickets: ['RAD-9241', 'RAD-9242', 'RAD-9281', 'RAD-9388', 'RAD-9397'],
    },
    ticketRows: [
      { id: 'RAD-9372', title: 'Add annotation batch export',      pr: null,    merged: null,  status: 'no-pr' },
      { id: 'RAD-9362', title: 'Fix label sync on refresh',        pr: null,    merged: null,  status: 'no-pr' },
      { id: 'RAD-9344', title: 'Improve task queue performance',   pr: null,    merged: null,  status: 'no-pr' },
      { id: 'RAD-9343', title: 'Update console sidebar layout',    pr: null,    merged: null,  status: 'no-pr' },
      { id: 'RAD-9337', title: 'Handle empty state in list view',  pr: null,    merged: null,  status: 'no-pr' },
      { id: 'RAD-9218', title: 'Fix date filter timezone offset',  pr: null,    merged: null,  status: 'no-pr' },
      { id: 'RAD-9241', title: 'Add bulk assign feature',          pr: '#1842', merged: true,  status: 'unregistered' },
      { id: 'RAD-9242', title: 'Update keyboard shortcuts',        pr: '#1843', merged: true,  status: 'unregistered' },
      { id: 'RAD-9281', title: 'Fix drag-and-drop reorder',        pr: '#1871', merged: true,  status: 'unregistered' },
      { id: 'RAD-9388', title: 'Annotation tool zoom reset',       pr: '#1924', merged: true,  status: 'unregistered' },
      { id: 'RAD-9397', title: 'Console header accessibility',     pr: '#1931', merged: true,  status: 'unregistered' },
      { id: 'RAD-9100', title: 'Payment gateway webhook handler',  pr: '#1801', merged: true,  status: 'deployed-this' },
      { id: 'RAD-9101', title: 'Refund flow partial amount fix',   pr: '#1802', merged: true,  status: 'deployed-this' },
      { id: 'RAD-9102', title: 'PG type enum extension',           pr: '#1803', merged: true,  status: 'deployed-this' },
      { id: 'RAD-9050', title: 'Node 18→20 upgrade',              pr: '#1750', merged: true,  status: 'deployed-prev' },
      { id: 'RAD-9051', title: 'CI pipeline update',              pr: '#1751', merged: true,  status: 'deployed-prev' },
    ],
  },
  'odm-0401': {
    title: 'ODM Monthly 26-04-01',
    stats: { total: 12, withPR: 12, noPR: 0, merged: 12, deployedThis: 7, deployedPrev: 5 },
    repos: ['aip-oncology (v1.8.2)', 'oncology-data-management (v1.8.0)'],
    noPRTickets: [],
    unregisteredPRs: {
      count: 9,
      tickets: [],
      breakdown: { needed: 4, notNeeded: 2, noTicket: 3 },
    },
    ticketRows: [
      { id: 'ODM-411', title: 'Case-level QC workflow',        pr: '#312', merged: true, status: 'deployed-this' },
      { id: 'ODM-412', title: 'Batch import validation rules', pr: '#313', merged: true, status: 'deployed-this' },
      { id: 'ODM-413', title: 'Pathology report parser',       pr: '#314', merged: true, status: 'deployed-this' },
      { id: 'ODM-380', title: 'Staging environment config',    pr: '#290', merged: true, status: 'deployed-prev' },
      { id: 'ODM-381', title: 'DB schema migration v3',        pr: '#291', merged: true, status: 'deployed-prev' },
    ],
  },
}
