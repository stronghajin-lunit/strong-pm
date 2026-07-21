'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { fetchJiraTicketRuns } from '@/api/jira-tickets'
import { JiraTicketForm } from '@/components/jira-ticket/jira-ticket-form'
import { useUIStore } from '@/stores/ui-store'
import type { JiraTicketRunRecord, JiraTicketRunStatus, JiraTicketType } from '@/types/jira-ticket'

const STATUS_CONFIG: Record<JiraTicketRunStatus, { label: string; bg: string; color: string }> = {
  running: { label: 'Running', bg: '#FAEEDA', color: '#854F0B' },
  done:    { label: 'Done',    bg: '#EFF6FF', color: '#1E40AF' },
  error:   { label: 'Error',   bg: '#FAECE7', color: '#993C1D' },
}

const TYPE_CONFIG: Record<JiraTicketType, { bg: string; color: string }> = {
  Task: { bg: '#E8EDF8', color: '#1F3F8E' },
  Bug:  { bg: '#FAECE7', color: '#993C1D' },
}

export default function JiraTicketWriterPage() {
  const setTopbarTitle = useUIStore((s) => s.setTopbarTitle)
  const searchParams = useSearchParams()
  const router = useRouter()
  const view = searchParams.get('view') === 'create' ? 'create' : 'list'
  const [history, setHistory] = useState<JiraTicketRunRecord[]>([])

  useEffect(() => {
    setTopbarTitle('Jira Ticket Writer')
    void fetchJiraTicketRuns().then(setHistory)
  }, [setTopbarTitle])

  const handleRun = (temp: JiraTicketRunRecord, promise: Promise<JiraTicketRunRecord>) => {
    setHistory((prev) => [temp, ...prev])
    router.push('/jira-ticket-writer')
    void promise
      .then((record) => setHistory((prev) => prev.map((r) => (r.id === temp.id ? record : r))))
      .catch(() => setHistory((prev) => prev.map((r) => (r.id === temp.id ? { ...r, status: 'error' } : r))))
  }

  if (view === 'create') {
    return (
      <div className="px-7 py-6">
        <div className="flex items-center gap-3 mb-5">
          <button
            type="button"
            data-testid="back-btn"
            onClick={() => router.push('/jira-ticket-writer')}
            className="flex items-center gap-[5px] text-[12px] font-medium px-3 py-[6px] rounded-[6px] transition-colors hover:opacity-80"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-md)', color: 'var(--text-2)' }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="11" height="11">
              <path d="M10 3L5 8l5 5" />
            </svg>
            Back to list
          </button>
          <h2 className="text-[18px] font-semibold tracking-[-0.3px]">New Jira Ticket</h2>
        </div>

        <JiraTicketForm onRun={handleRun} />
      </div>
    )
  }

  return (
    <div className="px-7 py-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.4px]">Jira Ticket Writer</h2>
          <p className="text-[12px] mt-[3px]" style={{ color: 'var(--text-3)' }}>
            Enter a feature description and DoD to automatically generate Jira tickets.
          </p>
        </div>
        <button
          type="button"
          data-testid="new-btn"
          onClick={() => router.push('?view=create')}
          className="flex items-center gap-[5px] px-[14px] py-[8px] rounded-[8px] text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--accent)' }}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
            <path d="M8 3v10M3 8h10" />
          </svg>
          New Jira Ticket
        </button>
      </div>

      <div
        className="rounded-[12px] overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
              {['ID', 'Summary', 'Sprint', 'Type', 'Requested', 'Status', 'Link'].map((col) => (
                <th
                  key={col}
                  className="text-left px-[14px] py-2"
                  style={{
                    fontSize: '11px',
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
                <td colSpan={7}>
                  <div className="py-10 flex flex-col items-center gap-2">
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      width="28"
                      height="28"
                      className="opacity-30"
                      style={{ color: 'var(--text-3)' }}
                    >
                      <rect x="2" y="5" width="12" height="9" rx="1" />
                      <path d="M2 9h12" />
                      <path d="M5 5V3.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V5" />
                    </svg>
                    <p className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>
                      No execution history yet
                    </p>
                    <button
                      type="button"
                      onClick={() => router.push('?view=create')}
                      className="flex items-center gap-[5px] px-[12px] py-[6px] rounded-[7px] text-[12px] font-semibold text-white transition-opacity hover:opacity-90 mt-1"
                      style={{ background: 'var(--accent)' }}
                    >
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
                        <path d="M8 3v10M3 8h10" />
                      </svg>
                      New Jira Ticket
                    </button>
                  </div>
                </td>
              </tr>
            ) : history.map((record, idx) => {
              const cfg = STATUS_CONFIG[record.status]
              const typeCfg = TYPE_CONFIG[record.type]
              return (
                <tr
                  key={record.id}
                  data-testid={`history-row-${record.id}`}
                  className="transition-colors"
                  style={idx < history.length - 1 ? { borderBottom: '1px solid var(--border)' } : undefined}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-light)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                >
                  <td className="px-[14px] py-[11px] text-[11px] font-mono whitespace-nowrap" style={{ color: 'var(--text-3)' }}>{record.id}</td>
                  <td className="px-[14px] py-[11px] text-[12px]" style={{ color: 'var(--text-2)', maxWidth: 300 }}>
                    <span className="block truncate">{record.summary}</span>
                  </td>
                  <td className="px-[14px] py-[11px] text-[12px] whitespace-nowrap" style={{ color: 'var(--text-2)' }}>
                    {record.sprint}
                  </td>
                  <td className="px-[14px] py-[11px]">
                    <span
                      className="text-[11px] font-semibold px-[7px] py-[2px] rounded-[7px]"
                      style={{ background: typeCfg.bg, color: typeCfg.color }}
                    >
                      {record.type}
                    </span>
                  </td>
                  <td className="px-[14px] py-[11px] text-[12px] whitespace-nowrap" style={{ color: 'var(--text-3)' }}>
                    {record.requestedAt}
                  </td>
                  <td className="px-[14px] py-[11px]">
                    <span
                      data-testid={`history-status-${record.id}`}
                      className="text-[11px] font-semibold px-[7px] py-[2px] rounded-[7px]"
                      style={{ background: cfg.bg, color: cfg.color }}
                    >
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-[14px] py-[11px]">
                    {record.jiraUrl ? (
                      <a
                        href={record.jiraUrl}
                        target="_blank"
                        rel="noreferrer"
                        data-testid={`history-link-${record.id}`}
                        className="text-[11px] underline cursor-pointer"
                        style={{ color: 'var(--accent)' }}
                      >
                        Jira ↗
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
