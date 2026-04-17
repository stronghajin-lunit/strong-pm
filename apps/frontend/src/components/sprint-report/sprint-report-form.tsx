'use client'

import { useState } from 'react'
import type { SprintOption, SprintRunRecord } from '@/types/sprint'

interface SprintReportFormProps {
  sprintOptions: SprintOption[]
  initialHistory: SprintRunRecord[]
}

const RUN_STATUS_CONFIG: Record<SprintRunRecord['status'], { label: string; bg: string; color: string }> = {
  running: { label: 'Running', bg: '#FAEEDA', color: '#854F0B' },
  done:    { label: 'Done',    bg: '#E1F5EE', color: '#0F6E56' },
  error:   { label: 'Error',   bg: '#FAECE7', color: '#993C1D' },
}

export function SprintReportForm({ sprintOptions, initialHistory }: SprintReportFormProps) {
  const [selectedSprintId, setSelectedSprintId] = useState('')
  const [history, setHistory] = useState<SprintRunRecord[]>(initialHistory)

  const handleRun = () => {
    const selected = sprintOptions.find((s) => s.id === selectedSprintId)
    if (!selected) return

    const newRecord: SprintRunRecord = {
      id: `run-${Date.now()}`,
      sprintLabel: selected.label,
      projectName: selected.projectName,
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

        <div>
          <label className="block text-[11px] font-semibold mb-[5px]" style={{ color: 'var(--text-2)' }}>
            Jira Sprint{' '}
            <span
              className="text-[10px] font-normal px-[6px] py-[1px] rounded-[6px]"
              style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
            >
              Required
            </span>
          </label>
          <select
            data-testid="sprint-select"
            value={selectedSprintId}
            onChange={(e) => setSelectedSprintId(e.target.value)}
            className="w-full rounded-[6px] px-[10px] py-2 text-[13px] outline-none"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border-md)',
              color: 'var(--text-1)',
            }}
          >
            <option value="">— Select sprint —</option>
            {sprintOptions.map((sprint) => (
              <option key={sprint.id} value={sprint.id}>
                {sprint.label} · {sprint.projectName} ({sprint.status === 'active' ? 'Active' : 'Done'})
              </option>
            ))}
          </select>
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>
            Completed and incomplete issues are auto-collected from the Jira board sprint.
          </p>
        </div>
      </div>

      {/* Run button */}
      <div className="flex justify-end mb-7">
        <button
          type="button"
          data-testid="run-btn"
          onClick={handleRun}
          disabled={!selectedSprintId}
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
              {['Jira Sprint', 'Requested', 'Status', 'Link'].map((col) => (
                <th
                  key={col}
                  className="text-left px-[14px] py-2"
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: 'var(--text-3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={4}>
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
              const statusCfg = RUN_STATUS_CONFIG[record.status]
              return (
                <tr
                  key={record.id}
                  data-testid={`history-row-${record.id}`}
                  className="transition-colors"
                  style={idx < history.length - 1 ? { borderBottom: '1px solid var(--border)' } : undefined}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                >
                  <td className="px-[14px] py-[9px] text-[12px]">
                    <span className="font-medium">{record.sprintLabel}</span>
                    {' · '}
                    <span style={{ color: 'var(--text-2)' }}>{record.projectName}</span>
                  </td>
                  <td
                    className="px-[14px] py-[9px] text-[12px] whitespace-nowrap"
                    style={{ color: 'var(--text-3)' }}
                  >
                    {record.requestedAt}
                  </td>
                  <td className="px-[14px] py-[9px]">
                    <span
                      data-testid={`history-status-${record.id}`}
                      className="text-[10px] font-semibold px-[7px] py-[2px] rounded-[7px]"
                      style={{ background: statusCfg.bg, color: statusCfg.color }}
                    >
                      {statusCfg.label}
                    </span>
                  </td>
                  <td className="px-[14px] py-[9px]">
                    {record.confluenceUrl ? (
                      <a
                        href={record.confluenceUrl}
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

function nowStr(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
