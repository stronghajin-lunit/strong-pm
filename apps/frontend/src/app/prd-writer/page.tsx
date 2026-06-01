'use client'

import { Fragment, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { PrdForm } from '@/components/prd/prd-form'
import { ChatPanel } from '@/components/workspace/chat-panel'
import { useUIStore } from '@/stores/ui-store'
import { useChatStore } from '@/stores/chat-store'
import { MOCK_PRD_HISTORY } from '@/mocks/prd'
import type { PrdRunRecord, PrdRunStatus } from '@/types/prd'

const STATUS_CONFIG: Record<PrdRunStatus, { label: string; bg: string; color: string }> = {
  running: { label: 'Running', bg: '#FAEEDA', color: '#854F0B' },
  done:    { label: 'Done',    bg: '#EFF6FF', color: '#1E40AF' },
  error:   { label: 'Error',   bg: '#FAECE7', color: '#993C1D' },
}

const COLS = ['Project', 'Requested', 'Completed', 'Status', 'Link', '반영']
const COL_SPAN = COLS.length

export default function PrdWriterPage() {
  const setTopbarTitle = useUIStore((s) => s.setTopbarTitle)
  const openChat = useChatStore((s) => s.openChat)
  const searchParams = useSearchParams()
  const router = useRouter()
  const view = searchParams.get('view') === 'create' ? 'create' : 'list'
  const [history, setHistory] = useState<PrdRunRecord[]>(MOCK_PRD_HISTORY)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  useEffect(() => {
    setTopbarTitle('PRD Writer')
  }, [setTopbarTitle])

  const handleRunComplete = (record: PrdRunRecord) => {
    setHistory((prev) => [record, ...prev])
    router.push('/prd-writer')
  }

  const handleReflectionConfirm = (recordId: string, text: string) => {
    setHistory((prev) =>
      prev.map((r) => (r.id === recordId ? { ...r, reflection: text } : r)),
    )
    setExpandedRows((prev) => new Set([...prev, recordId]))
  }

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (view === 'create') {
    return (
      <div className="px-7 py-6">
        <div className="flex items-center gap-3 mb-5">
          <button
            type="button"
            data-testid="back-btn"
            onClick={() => router.push('/prd-writer')}
            className="flex items-center gap-[5px] text-[12px] font-medium px-3 py-[6px] rounded-[6px] transition-colors hover:opacity-80"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-md)', color: 'var(--text-2)' }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="11" height="11">
              <path d="M10 3L5 8l5 5" />
            </svg>
            Back to list
          </button>
          <h2 className="text-[18px] font-semibold tracking-[-0.3px]">New PRD</h2>
        </div>

        <PrdForm onRunComplete={handleRunComplete} />
      </div>
    )
  }

  return (
    <div className="px-7 py-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.4px]">PRD Writer</h2>
          <p className="text-[12px] mt-[3px]" style={{ color: 'var(--text-3)' }}>
            Parses a Kickoff document to auto-generate PRDs and update a Confluence page.
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
          New PRD
        </button>
      </div>

      <div
        className="rounded-[12px] overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
              {COLS.map((col) => (
                <th
                  key={col}
                  className="text-left px-[14px] py-2"
                  style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={COL_SPAN}>
                  <div className="py-10 flex flex-col items-center gap-2">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" width="28" height="28" className="opacity-30" style={{ color: 'var(--text-3)' }}>
                      <rect x="2" y="5" width="12" height="9" rx="1" />
                      <path d="M2 9h12" />
                      <path d="M5 5V3.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V5" />
                    </svg>
                    <p className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>No execution history yet</p>
                    <button
                      type="button"
                      onClick={() => router.push('?view=create')}
                      className="flex items-center gap-[5px] px-[12px] py-[6px] rounded-[7px] text-[12px] font-semibold text-white transition-opacity hover:opacity-90 mt-1"
                      style={{ background: 'var(--accent)' }}
                    >
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
                        <path d="M8 3v10M3 8h10" />
                      </svg>
                      New PRD
                    </button>
                  </div>
                </td>
              </tr>
            ) : history.map((record, idx) => {
              const cfg = STATUS_CONFIG[record.status]
              const isExpanded = expandedRows.has(record.id)
              const canReflect = record.status === 'done' && !record.reflection
              const reflected = !!record.reflection

              return (
                <Fragment key={record.id}>
                  <tr
                    data-testid={`history-row-${record.id}`}
                    className="transition-colors"
                    style={
                      idx < history.length - 1 || (reflected && isExpanded)
                        ? { borderBottom: '1px solid var(--border)' }
                        : undefined
                    }
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-light)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  >
                    {/* Project (with expand toggle if reflected) */}
                    <td className="px-[14px] py-[11px] text-[12px] font-medium whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {reflected && (
                          <button
                            type="button"
                            onClick={() => toggleExpand(record.id)}
                            data-testid={`expand-btn-${record.id}`}
                            className="flex-shrink-0 transition-transform"
                            style={{ color: 'var(--text-3)', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                          >
                            <svg viewBox="0 0 16 16" fill="currentColor" width="10" height="10">
                              <path d="M6 4l4 4-4 4V4z" />
                            </svg>
                          </button>
                        )}
                        {record.projectName}
                      </div>
                    </td>

                    {/* Requested */}
                    <td className="px-[14px] py-[11px] text-[12px] whitespace-nowrap" style={{ color: 'var(--text-3)' }}>
                      {record.requestedAt}
                    </td>

                    {/* Completed */}
                    <td
                      className="px-[14px] py-[11px] text-[12px] whitespace-nowrap"
                      style={{ color: 'var(--text-3)' }}
                      data-testid={`completed-at-${record.id}`}
                    >
                      {record.completedAt ?? '—'}
                    </td>

                    {/* Status */}
                    <td className="px-[14px] py-[11px]">
                      <span
                        data-testid={`history-status-${record.id}`}
                        className="text-[11px] font-semibold px-[7px] py-[2px] rounded-[7px]"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                    </td>

                    {/* Link */}
                    <td className="px-[14px] py-[11px]">
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

                    {/* Applied */}
                    <td className="px-[14px] py-[11px]">
                      {reflected ? (
                        <button
                          type="button"
                          disabled
                          data-testid={`reflect-btn-${record.id}`}
                          className="text-[11px] font-medium px-[8px] py-[3px] rounded-[6px] opacity-50 cursor-not-allowed"
                          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
                        >
                          반영완료
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!canReflect}
                          data-testid={`reflect-btn-${record.id}`}
                          onClick={() =>
                            record.confluenceUrl &&
                            openChat({
                              recordId: record.id,
                              recordType: 'prd',
                              confluenceUrl: record.confluenceUrl,
                            })
                          }
                          className="text-[11px] font-medium px-[8px] py-[3px] rounded-[6px] transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                        >
                          반영
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Accordion row */}
                  {reflected && isExpanded && (
                    <tr
                      key={`${record.id}-reflection`}
                      data-testid={`reflection-row-${record.id}`}
                      style={idx < history.length - 1 ? { borderBottom: '1px solid var(--border)' } : undefined}
                    >
                      <td colSpan={COL_SPAN} className="px-[14px] py-3">
                        <div
                          className="rounded-[8px] px-4 py-3 text-[12px] leading-[1.6]"
                          style={{ background: 'var(--surface-2)' }}
                        >
                          <p
                            className="text-[11px] font-semibold mb-1"
                            style={{ color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                          >
                            Applied Notes
                          </p>
                          <p style={{ color: 'var(--text-1)' }}>{record.reflection}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      <ChatPanel onConfirm={handleReflectionConfirm} />
    </div>
  )
}
