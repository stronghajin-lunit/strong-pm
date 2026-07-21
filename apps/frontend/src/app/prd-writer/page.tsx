'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { fetchPrdRuns } from '@/api/prd'
import { PrdForm } from '@/components/prd/prd-form'
import { useUIStore } from '@/stores/ui-store'
import type { PrdRunRecord, PrdRunStatus } from '@/types/prd'

const STATUS_CONFIG: Record<PrdRunStatus, { label: string; bg: string; color: string }> = {
  running: { label: 'Running', bg: '#FAEEDA', color: '#854F0B' },
  done:    { label: 'Done',    bg: '#EFF6FF', color: '#1E40AF' },
  error:   { label: 'Error',   bg: '#FAECE7', color: '#993C1D' },
}

const COLS = ['ID', 'Project', 'Target Team', 'Requested', 'Completed', 'Status', 'Link']

export default function PrdWriterPage() {
  const setTopbarTitle = useUIStore((s) => s.setTopbarTitle)
  const searchParams = useSearchParams()
  const router = useRouter()
  const view = searchParams.get('view') === 'create' ? 'create' : 'list'
  const [history, setHistory] = useState<PrdRunRecord[]>([])

  useEffect(() => {
    setTopbarTitle('PRD Writer')
    void fetchPrdRuns().then(setHistory).catch(() => setHistory([]))
  }, [setTopbarTitle])

  const handleRun = (temp: PrdRunRecord, promise: Promise<PrdRunRecord>) => {
    setHistory((prev) => [temp, ...prev])
    router.push('/prd-writer')
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
        <PrdForm onRun={handleRun} />
      </div>
    )
  }

  return (
    <div className="px-7 py-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.4px]">PRD Writer</h2>
          <p className="text-[12px] mt-[3px]" style={{ color: 'var(--text-3)' }}>
            Parses a Kickoff document to auto-generate PRD content and update a Confluence page.
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

      <div className="rounded-[12px] overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
              {COLS.map((col) => (
                <th key={col} className="text-left px-[14px] py-2"
                  style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={COLS.length}>
                  <div className="py-10 flex flex-col items-center gap-2">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" width="28" height="28" className="opacity-30" style={{ color: 'var(--text-3)' }}>
                      <rect x="2" y="5" width="12" height="9" rx="1" />
                      <path d="M2 9h12" /><path d="M5 5V3.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V5" />
                    </svg>
                    <p className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>No PRD runs yet</p>
                    <button type="button" onClick={() => router.push('?view=create')}
                      className="flex items-center gap-[5px] px-[12px] py-[6px] rounded-[7px] text-[12px] font-semibold text-white transition-opacity hover:opacity-90 mt-1"
                      style={{ background: 'var(--accent)' }}>
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11"><path d="M8 3v10M3 8h10" /></svg>
                      New PRD
                    </button>
                  </div>
                </td>
              </tr>
            ) : history.map((record, idx) => {
              const cfg = STATUS_CONFIG[record.status]
              return (
                <tr key={record.id} data-testid={`history-row-${record.id}`} className="transition-colors"
                  style={idx < history.length - 1 ? { borderBottom: '1px solid var(--border)' } : undefined}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-light)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
                  <td className="px-[14px] py-[11px] text-[11px] font-mono whitespace-nowrap" style={{ color: 'var(--text-3)' }}>{record.id}</td>
                  <td className="px-[14px] py-[11px] text-[12px] font-medium">{record.projectName}</td>
                  <td className="px-[14px] py-[11px]">
                    <div className="flex flex-wrap gap-[4px]">
                      {record.targetTeams.map((t) => (
                        <span key={t} className="text-[11px] px-[6px] py-[2px] rounded-[5px]"
                          style={{ background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border-md)' }}>
                          {t.split(' (')[0]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-[14px] py-[11px] text-[12px] whitespace-nowrap" style={{ color: 'var(--text-3)' }}>{record.requestedAt}</td>
                  <td className="px-[14px] py-[11px] text-[12px] whitespace-nowrap" style={{ color: 'var(--text-3)' }}>{record.completedAt ?? '—'}</td>
                  <td className="px-[14px] py-[11px]">
                    <span className="text-[11px] font-semibold px-[7px] py-[2px] rounded-[7px]" style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-[14px] py-[11px]">
                    {record.confluenceUrl ? (
                      <a href={record.confluenceUrl} target="_blank" rel="noreferrer" className="text-[11px] underline" style={{ color: 'var(--accent)' }}>
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
