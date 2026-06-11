'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { fetchFeatureListRuns, applyFeatureComments, fetchApplyLogs } from '@/api/feature-list'
import type { FeatureListRun, ApplyLogEntry, ChangeDetail } from '@/api/feature-list'
import { FeatureListForm } from '@/components/feature-list/feature-list-form'
import { useUIStore } from '@/stores/ui-store'

type RunStatus = FeatureListRun['status']

const STATUS_CONFIG: Record<RunStatus, { label: string; bg: string; color: string }> = {
  running: { label: 'Running', bg: '#FAEEDA', color: '#854F0B' },
  done:    { label: 'Done',    bg: '#EFF6FF', color: '#1E40AF' },
  error:   { label: 'Error',   bg: '#FAECE7', color: '#993C1D' },
}

const COLS = ['ID', 'Project', 'Features', 'Requested', 'Completed', 'Status', 'Link', '']

function summarizeChange(c: ChangeDetail): string {
  if (c.action === 'delete') return `${c.featureId} "${c.featureName}" — deleted`
  const fields = Object.entries(c.changes)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ')
  return `${c.featureId} "${c.featureName}" — ${fields}`
}

export default function FeatureListWriterPage() {
  const setTopbarTitle = useUIStore((s) => s.setTopbarTitle)
  const searchParams = useSearchParams()
  const router = useRouter()
  const view = searchParams.get('view') === 'create' ? 'create' : 'list'
  const [history, setHistory] = useState<FeatureListRun[]>([])
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [applyError, setApplyError] = useState<string | null>(null)
  const [applySuccess, setApplySuccess] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [logsCache, setLogsCache] = useState<Record<string, ApplyLogEntry[]>>({})

  useEffect(() => {
    setTopbarTitle('Feature List Writer')
    void fetchFeatureListRuns().then(setHistory).catch(() => setHistory([]))
  }, [setTopbarTitle])

  const handleRun = (temp: FeatureListRun, promise: Promise<FeatureListRun>) => {
    setHistory((prev) => [temp, ...prev])
    router.push('/feature-list-writer')
    void promise
      .then((record) => setHistory((prev) => prev.map((r) => (r.id === temp.id ? record : r))))
      .catch(() => setHistory((prev) => prev.map((r) => (r.id === temp.id ? { ...r, status: 'error' } : r))))
  }

  const handleToggleExpand = async (record: FeatureListRun) => {
    if (expandedId === record.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(record.id)
    if (!logsCache[record.featureListPageUrl]) {
      const logs = await fetchApplyLogs(record.featureListPageUrl).catch(() => [])
      setLogsCache((prev) => ({ ...prev, [record.featureListPageUrl]: logs }))
    }
  }

  const handleApplyComments = async (record: FeatureListRun) => {
    setApplyingId(record.id)
    setApplyError(null)
    setApplySuccess(null)
    try {
      const result = await applyFeatureComments(record.featureListPageUrl)
      setApplySuccess(`Applied ${result.changesApplied} change(s), resolved ${result.commentsResolved} comment(s).`)
      const logs = await fetchApplyLogs(record.featureListPageUrl).catch(() => [])
      setLogsCache((prev) => ({ ...prev, [record.featureListPageUrl]: logs }))
    } catch (err) {
      const code = (err as { message?: string }).message
      if (code === 'NO_COMMENTS') setApplyError('No unresolved comments found on this page.')
      else if (code === 'NO_ACTIONABLE_CHANGES') setApplyError('Comments found but no actionable changes could be identified.')
      else setApplyError('Failed to apply comments. Please try again.')
    } finally {
      setApplyingId(null)
    }
  }

  if (view === 'create') {
    return (
      <div className="px-7 py-6">
        <div className="flex items-center gap-3 mb-5">
          <button
            type="button"
            onClick={() => router.push('/feature-list-writer')}
            className="flex items-center gap-[5px] text-[12px] font-medium px-3 py-[6px] rounded-[6px] transition-colors hover:opacity-80"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-md)', color: 'var(--text-2)' }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="11" height="11">
              <path d="M10 3L5 8l5 5" />
            </svg>
            Back to list
          </button>
          <h2 className="text-[18px] font-semibold tracking-[-0.3px]">New Feature List</h2>
        </div>
        <FeatureListForm onRun={handleRun} />
      </div>
    )
  }

  return (
    <div className="px-7 py-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.4px]">Feature List Writer</h2>
          <p className="text-[12px] mt-[3px]" style={{ color: 'var(--text-3)' }}>
            Reads PRD documents and auto-generates a structured Feature List in Confluence.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('?view=create')}
          className="flex items-center gap-[5px] px-[14px] py-[8px] rounded-[8px] text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--accent)' }}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
            <path d="M8 3v10M3 8h10" />
          </svg>
          New Feature List
        </button>
      </div>

      {applyError && (
        <div className="mb-4 px-4 py-3 rounded-[8px] text-[12px] flex items-center justify-between"
          style={{ background: '#FAECE7', color: '#993C1D', border: '1px solid #F5C6B4' }}>
          <span>{applyError}</span>
          <button type="button" onClick={() => setApplyError(null)} className="ml-3 underline">Dismiss</button>
        </div>
      )}
      {applySuccess && (
        <div className="mb-4 px-4 py-3 rounded-[8px] text-[12px] flex items-center justify-between"
          style={{ background: '#F0FDF4', color: '#166534', border: '1px solid #A7F3D0' }}>
          <span>{applySuccess}</span>
          <button type="button" onClick={() => setApplySuccess(null)} className="ml-3 underline">Dismiss</button>
        </div>
      )}

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
                      <rect x="2" y="2" width="12" height="12" rx="1" />
                      <path d="M5 6h6M5 9h4" />
                    </svg>
                    <p className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>No Feature List runs yet</p>
                    <button type="button" onClick={() => router.push('?view=create')}
                      className="flex items-center gap-[5px] px-[12px] py-[6px] rounded-[7px] text-[12px] font-semibold text-white transition-opacity hover:opacity-90 mt-1"
                      style={{ background: 'var(--accent)' }}>
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11"><path d="M8 3v10M3 8h10" /></svg>
                      New Feature List
                    </button>
                  </div>
                </td>
              </tr>
            ) : history.map((record, idx) => {
              const cfg = STATUS_CONFIG[record.status]
              const isExpanded = expandedId === record.id
              const logs = logsCache[record.featureListPageUrl] ?? []
              const hasLogs = record.status === 'done' && record.confluenceUrl
              return (
                <>
                  <tr key={record.id} className="transition-colors"
                    style={!isExpanded && idx < history.length - 1 ? { borderBottom: '1px solid var(--border)' } : undefined}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-light)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
                    <td className="px-[14px] py-[11px] text-[11px] font-mono whitespace-nowrap" style={{ color: 'var(--text-3)' }}>{record.id}</td>
                    <td className="px-[14px] py-[11px] text-[12px] font-medium">{record.projectName}</td>
                    <td className="px-[14px] py-[11px] text-[12px]" style={{ color: 'var(--text-3)' }}>
                      {record.featureCount != null ? `${record.featureCount} features` : '—'}
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
                    <td className="px-[14px] py-[11px]">
                      <div className="flex items-center gap-[6px]">
                        {record.status === 'done' && record.confluenceUrl ? (
                          <button
                            type="button"
                            onClick={() => handleApplyComments(record)}
                            disabled={applyingId === record.id}
                            className="text-[11px] font-medium px-[10px] py-[4px] rounded-[6px] transition-opacity hover:opacity-80 disabled:opacity-50"
                            style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)', color: 'var(--text-2)' }}
                          >
                            {applyingId === record.id ? 'Applying…' : 'Apply Comments'}
                          </button>
                        ) : (
                          <span />
                        )}
                        {hasLogs && (
                          <button
                            type="button"
                            onClick={() => handleToggleExpand(record)}
                            className="flex items-center justify-center w-[22px] h-[22px] rounded-[5px] transition-colors"
                            style={{ color: 'var(--text-3)', background: isExpanded ? 'var(--surface-2)' : 'transparent' }}
                            title="Toggle apply log"
                          >
                            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="11" height="11"
                              style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                              <path d="M4 6l4 4 4-4" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${record.id}-logs`} style={{ borderBottom: idx < history.length - 1 ? '1px solid var(--border)' : undefined }}>
                      <td colSpan={COLS.length} className="px-[14px] py-[10px]" style={{ background: 'var(--surface-2)' }}>
                        {logs.length === 0 ? (
                          <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>No apply history yet.</p>
                        ) : (
                          <div className="flex flex-col gap-[10px]">
                            {logs.map((log) => (
                              <div key={log.id}>
                                <div className="flex items-center gap-[8px] mb-[4px]">
                                  <span className="text-[11px] font-semibold" style={{ color: 'var(--text-2)' }}>{log.appliedAt}</span>
                                  <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                                    {log.changesApplied} change{log.changesApplied !== 1 ? 's' : ''}, {log.commentsResolved} comment{log.commentsResolved !== 1 ? 's' : ''} resolved
                                  </span>
                                </div>
                                <ul className="flex flex-col gap-[2px]">
                                  {log.changeDetails.map((c, i) => (
                                    <li key={i} className="text-[11px] flex items-start gap-[5px]" style={{ color: 'var(--text-2)' }}>
                                      <span style={{ color: c.action === 'delete' ? '#993C1D' : 'var(--accent)' }}>•</span>
                                      <span>{summarizeChange(c)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
