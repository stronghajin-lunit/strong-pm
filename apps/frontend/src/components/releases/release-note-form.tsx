'use client'

import { useState } from 'react'
import type {
  ConfluenceFolderOption,
  JiraVersionOption,
  ReleaseNoteRunRecord,
} from '@/types/release'
import { runReleaseNote } from '@/api/releases'

interface ReleaseNoteFormProps {
  confluenceFolders: ConfluenceFolderOption[]
  versionOptions?: JiraVersionOption[]
  onRunComplete?: (record: ReleaseNoteRunRecord) => void
}

export function ReleaseNoteForm({ confluenceFolders, versionOptions, onRunComplete }: ReleaseNoteFormProps) {
  const [jiraVersion, setJiraVersion]               = useState('')
  const [selectedVersionId, setSelectedVersionId]   = useState('')
  const [confluenceFolderId, setConfluenceFolderId] = useState('')
  const [isRunning, setIsRunning]                   = useState(false)

  const useRealApi = versionOptions !== undefined
  const canRun = useRealApi ? selectedVersionId !== '' : jiraVersion.trim() !== ''

  const handleRun = async () => {
    if (!canRun) return

    if (useRealApi) {
      const pageId = confluenceFolderId || confluenceFolders[0]?.id || ''
      setIsRunning(true)
      try {
        const record = await runReleaseNote(selectedVersionId, pageId)
        onRunComplete?.(record)
      } finally {
        setIsRunning(false)
      }
    } else {
      const folder =
        confluenceFolders.find((f) => f.id === confluenceFolderId)?.label ??
        'Default (Release Notes root)'

      const newRecord: ReleaseNoteRunRecord = {
        id: `rn-${Date.now()}`,
        jiraVersion: jiraVersion.trim(),
        confluenceLocation: folder,
        requestedAt: nowStr(),
        status: 'running',
        confluenceUrl: null,
      }

      setIsRunning(true)

      setTimeout(() => {
        const completedRecord: ReleaseNoteRunRecord = { ...newRecord, status: 'done', confluenceUrl: '#' }
        setIsRunning(false)
        onRunComplete?.(completedRecord)
      }, 2500)
    }
  }

  return (
    <div>
      {/* Config card */}
      <div
        className="rounded-[12px] p-5 mb-3"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div
          className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-[14px]"
          style={{ color: 'var(--text-3)' }}
        >
          Configuration
        </div>

        <div className="flex flex-col gap-4">
          {/* Jira Version */}
          <div>
            <label className="block text-[11px] font-semibold mb-[5px]" style={{ color: 'var(--text-2)' }}>
              Jira Version{' '}
              <RequiredBadge />
            </label>
            {useRealApi ? (
              <select
                data-testid="jira-version-select"
                value={selectedVersionId}
                onChange={(e) => setSelectedVersionId(e.target.value)}
                className="w-full rounded-[6px] px-[10px] py-2 text-[13px] outline-none"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-md)',
                  color: 'var(--text-1)',
                }}
              >
                <option value="">— Select version —</option>
                {versionOptions.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                data-testid="jira-version-input"
                value={jiraVersion}
                onChange={(e) => setJiraVersion(e.target.value)}
                placeholder="e.g. AICP Monthly 26-04-01 or ODM Monthly 26-04-01"
                className="w-full rounded-[6px] px-[10px] py-2 text-[13px] outline-none"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-md)',
                  color: 'var(--text-1)',
                }}
              />
            )}
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>
              {useRealApi
                ? 'Issues are collected based on Jira Fix Version.'
                : 'Enter the Jira Fix Version name exactly as-is. Product is auto-detected from the prefix (AICP/ODM).'}
            </p>
          </div>

          {/* Confluence folder */}
          <div>
            <label className="block text-[11px] font-semibold mb-[5px]" style={{ color: 'var(--text-2)' }}>
              Confluence Parent Page / Folder{' '}
              <span
                className="text-[11px] font-normal px-[6px] py-[1px] rounded-[6px]"
                style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}
              >
                {useRealApi ? 'Required' : 'Optional'}
              </span>
            </label>
            <select
              data-testid="confluence-folder-select"
              value={confluenceFolderId}
              onChange={(e) => setConfluenceFolderId(e.target.value)}
              className="w-full rounded-[6px] px-[10px] py-2 text-[13px] outline-none"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-md)',
                color: 'var(--text-1)',
              }}
            >
              {confluenceFolders.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>
              Leave blank to create in the team's default release notes folder.
            </p>
          </div>
        </div>
      </div>

      {/* Run button */}
      <div className="flex justify-end">
        <button
          type="button"
          data-testid="run-btn"
          onClick={handleRun}
          disabled={!canRun || isRunning}
          className="flex items-center gap-[6px] px-[22px] py-[10px] rounded-[8px] text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'var(--accent)' }}
        >
          <svg viewBox="0 0 16 16" fill="#fff" width="12" height="12">
            <polygon points="4,2 14,8 4,14" />
          </svg>
          {isRunning ? 'Running...' : 'Run'}
        </button>
      </div>
    </div>
  )
}

function RequiredBadge() {
  return (
    <span
      className="text-[11px] font-normal px-[6px] py-[1px] rounded-[6px]"
      style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
    >
      Required
    </span>
  )
}

function nowStr(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
