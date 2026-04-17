'use client'

import { useState } from 'react'
import type {
  ConfluenceFolderOption,
  ReleaseNoteRunRecord,
  ReleaseRunStatus,
} from '@/types/release'

interface ReleaseNoteFormProps {
  confluenceFolders: ConfluenceFolderOption[]
  initialHistory: ReleaseNoteRunRecord[]
}

const STATUS_CONFIG: Record<ReleaseRunStatus, { label: string; bg: string; color: string }> = {
  running: { label: 'Running', bg: '#FAEEDA', color: '#854F0B' },
  done:    { label: 'Done',    bg: '#E1F5EE', color: '#0F6E56' },
  error:   { label: 'Error',   bg: '#FAECE7', color: '#993C1D' },
}

export function ReleaseNoteForm({ confluenceFolders, initialHistory }: ReleaseNoteFormProps) {
  const [jiraVersion, setJiraVersion]           = useState('')
  const [confluenceFolderId, setConfluenceFolderId] = useState('')
  const [history, setHistory]                   = useState<ReleaseNoteRunRecord[]>(initialHistory)

  const canRun = jiraVersion.trim() !== ''

  const handleRun = () => {
    if (!canRun) return

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

    setHistory((prev) => [newRecord, ...prev])

    setTimeout(() => {
      setHistory((prev) =>
        prev.map((r) =>
          r.id === newRecord.id ? { ...r, status: 'done', confluenceUrl: '#' } : r,
        ),
      )
    }, 2500)
  }

  return (
    <div>
      {/* Config card */}
      <div
        className="rounded-[12px] p-5 mb-3"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div
          className="text-[10px] font-semibold uppercase tracking-[0.06em] mb-[14px]"
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
            <input
              type="text"
              data-testid="jira-version-input"
              value={jiraVersion}
              onChange={(e) => setJiraVersion(e.target.value)}
              placeholder="예) AICP Monthly 26-04-01 또는 ODM Monthly 26-04-01"
              className="w-full rounded-[6px] px-[10px] py-2 text-[13px] outline-none"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-md)',
                color: 'var(--text-1)',
              }}
            />
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>
              Jira Fix Version 이름을 그대로 입력하세요. Product는 prefix(AICP/ODM)에서 자동으로 감지됩니다.
            </p>
          </div>

          {/* Confluence folder */}
          <div>
            <label className="block text-[11px] font-semibold mb-[5px]" style={{ color: 'var(--text-2)' }}>
              Confluence Parent Page / Folder{' '}
              <span
                className="text-[10px] font-normal px-[6px] py-[1px] rounded-[6px]"
                style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}
              >
                Optional
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
              비워두면 팀 기본 릴리즈 노트 폴더에 생성됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* Run button */}
      <div className="flex justify-end mb-7">
        <button
          type="button"
          data-testid="run-btn"
          onClick={handleRun}
          disabled={!canRun}
          className="flex items-center gap-[6px] px-[22px] py-[10px] rounded-[8px] text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'var(--accent)' }}
        >
          <svg viewBox="0 0 16 16" fill="#fff" width="12" height="12">
            <polygon points="4,2 14,8 4,14" />
          </svg>
          Run
        </button>
      </div>

      {/* Run History */}
      <div
        className="text-[10px] font-semibold uppercase tracking-[0.06em] mb-[9px]"
        style={{ color: 'var(--text-3)' }}
      >
        Run History
      </div>

      <div
        className="rounded-[12px] overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
              {['Jira Version', 'Confluence Location', 'Requested', 'Status', 'Link'].map((col) => (
                <th
                  key={col}
                  className="text-left px-[14px] py-2"
                  style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="py-10 flex flex-col items-center gap-2">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" width="28" height="28" className="opacity-30" style={{ color: 'var(--text-3)' }}>
                      <rect x="2" y="5" width="12" height="9" rx="1" />
                      <path d="M2 9h12" />
                      <path d="M5 5V3.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V5" />
                    </svg>
                    <p className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>아직 실행 기록이 없습니다</p>
                    <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>위 Run 버튼을 눌러 시작하세요.</p>
                  </div>
                </td>
              </tr>
            ) : history.map((record, idx) => {
              const cfg = STATUS_CONFIG[record.status]
              return (
                <tr
                  key={record.id}
                  data-testid={`history-row-${record.id}`}
                  className="transition-colors"
                  style={idx < history.length - 1 ? { borderBottom: '1px solid var(--border)' } : undefined}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                >
                  <td className="px-[14px] py-[9px] text-[12px] font-medium">
                    {record.jiraVersion}
                  </td>
                  <td className="px-[14px] py-[9px] text-[12px]" style={{ color: 'var(--text-2)' }}>
                    {record.confluenceLocation}
                  </td>
                  <td className="px-[14px] py-[9px] text-[12px] whitespace-nowrap" style={{ color: 'var(--text-3)' }}>
                    {record.requestedAt}
                  </td>
                  <td className="px-[14px] py-[9px]">
                    <span
                      data-testid={`history-status-${record.id}`}
                      className="text-[10px] font-semibold px-[7px] py-[2px] rounded-[7px]"
                      style={{ background: cfg.bg, color: cfg.color }}
                    >
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-[14px] py-[9px]">
                    {record.confluenceUrl ? (
                      <a
                        href={record.confluenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        data-testid={`history-link-${record.id}`}
                        className="text-[11px] underline cursor-pointer"
                        style={{ color: 'var(--accent)' }}
                      >
                        Confluence ↗
                      </a>
                    ) : (
                      <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RequiredBadge() {
  return (
    <span
      className="text-[10px] font-normal px-[6px] py-[1px] rounded-[6px]"
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
