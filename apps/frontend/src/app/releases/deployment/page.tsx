'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useUIStore } from '@/stores/ui-store'
import { DeploymentForm } from '@/components/releases/deployment-form'
import {
  fetchJiraVersions,
  fetchDeployments,
  fetchDeploymentDetail,
  runDeployment,
} from '@/api/releases'
import type { DeploymentResult, JiraVersionOption } from '@/types/release'
import type { DeploymentSummary } from '@/api/releases'

interface DeploymentHistoryRecord extends DeploymentSummary {
  result?: DeploymentResult
}

export default function DeploymentPage() {
  const setTopbarTitle = useUIStore((s) => s.setTopbarTitle)
  const searchParams = useSearchParams()
  const router = useRouter()
  const [history, setHistory] = useState<DeploymentHistoryRecord[]>([])
  const [versionOptions, setVersionOptions] = useState<JiraVersionOption[]>([])
  const [detailRecord, setDetailRecord] = useState<DeploymentHistoryRecord | null>(null)
  const pendingSummaryRef = useRef<DeploymentSummary | null>(null)

  const viewParam = searchParams.get('view')
  const view: 'list' | 'create' | 'detail' =
    viewParam === 'create' ? 'create' :
    viewParam === 'detail' && detailRecord ? 'detail' : 'list'

  useEffect(() => {
    setTopbarTitle('Deployment Tracker')
    void fetchJiraVersions().then(setVersionOptions)
    void fetchDeployments().then(setHistory)
  }, [setTopbarTitle])

  const handleRun = async (versionId: string): Promise<DeploymentResult> => {
    const { summary, result } = await runDeployment(versionId)
    pendingSummaryRef.current = summary
    return result
  }

  const handleRunComplete = (result: DeploymentResult) => {
    const summary = pendingSummaryRef.current
    if (summary) {
      setHistory((prev) => [{ ...summary, result }, ...prev])
    }
    router.push('/releases/deployment')
  }

  const handleOpenDetail = async (record: DeploymentHistoryRecord) => {
    if (record.result) {
      setDetailRecord(record)
    } else {
      const result = await fetchDeploymentDetail(record.id)
      const full = { ...record, result }
      setDetailRecord(full)
      setHistory((prev) => prev.map((r) => (r.id === record.id ? full : r)))
    }
    router.push('?view=detail')
  }

  if (view === 'create') {
    return (
      <div className="px-7 py-6">
        <div className="flex items-center gap-3 mb-5">
          <button
            type="button"
            data-testid="back-btn"
            onClick={() => router.push('/releases/deployment')}
            className="flex items-center gap-[5px] text-[12px] font-medium px-3 py-[6px] rounded-[6px] transition-colors hover:opacity-80"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-md)', color: 'var(--text-2)' }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="11" height="11">
              <path d="M10 3L5 8l5 5" />
            </svg>
            Back to list
          </button>
          <h2 className="text-[18px] font-semibold tracking-[-0.3px]">New Analysis</h2>
        </div>

        <div className="max-w-[960px]">
          <DeploymentForm
            versionOptions={versionOptions}
            onRun={handleRun}
            onRunComplete={handleRunComplete}
          />
        </div>
      </div>
    )
  }

  if (view === 'detail' && detailRecord) {
    return (
      <div className="px-7 py-6">
        <div className="flex items-center gap-3 mb-5">
          <button
            type="button"
            onClick={() => router.push('/releases/deployment')}
            className="flex items-center gap-[5px] text-[12px] font-medium px-3 py-[6px] rounded-[6px] transition-colors hover:opacity-80"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-md)', color: 'var(--text-2)' }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="11" height="11">
              <path d="M10 3L5 8l5 5" />
            </svg>
            Back to list
          </button>
          <div>
            <h2 className="text-[18px] font-semibold tracking-[-0.3px]">{detailRecord.version}</h2>
            <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>Run at {detailRecord.runAt}</span>
          </div>
        </div>

        <div className="max-w-[960px]">
          <DeploymentForm
            versionOptions={versionOptions}
            initialResult={detailRecord.result}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="px-7 py-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.4px]">Deployment Tracker</h2>
          <p className="text-[12px] mt-[3px]" style={{ color: 'var(--text-3)' }}>
            Cross-reference Jira tickets with GitHub PRs to verify deployment status.
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
          New Analysis
        </button>
      </div>

      <div
        className="rounded-[12px] overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
              {['ID', 'Version', 'Run At', 'Total', 'Deployed', 'No PR', 'Unregistered', ''].map((col) => (
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
                <td colSpan={8}>
                  <div className="py-10 flex flex-col items-center gap-2">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" width="28" height="28" className="opacity-30" style={{ color: 'var(--text-3)' }}>
                      <circle cx="8" cy="8" r="6" />
                      <path d="M8 5v3l2 2" />
                    </svg>
                    <p className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>No analysis history yet</p>
                    <button
                      type="button"
                      onClick={() => router.push('?view=create')}
                      className="px-[14px] py-[7px] rounded-[8px] text-[12px] font-semibold text-white transition-opacity hover:opacity-90 mt-1"
                      style={{ background: 'var(--accent)' }}
                    >
                      New Analysis
                    </button>
                  </div>
                </td>
              </tr>
            ) : history.map((record, idx) => (
              <tr
                key={record.id}
                data-testid={`history-row-${record.id}`}
                className="transition-colors cursor-pointer"
                style={idx < history.length - 1 ? { borderBottom: '1px solid var(--border)' } : undefined}
                onClick={() => void handleOpenDetail(record)}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
              >
                <td className="px-[14px] py-[10px] text-[11px] font-mono whitespace-nowrap" style={{ color: 'var(--text-3)' }}>{record.id}</td>
                <td className="px-[14px] py-[10px] text-[12px] font-medium">{record.version}</td>
                <td className="px-[14px] py-[10px] text-[12px] whitespace-nowrap" style={{ color: 'var(--text-3)' }}>
                  {record.runAt}
                </td>
                <td className="px-[14px] py-[10px] text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>
                  {record.total}
                </td>
                <td className="px-[14px] py-[10px] text-[13px] font-semibold" style={{ color: 'var(--accent)' }}>
                  {record.deployedThis}
                </td>
                <td className="px-[14px] py-[10px] text-[13px] font-semibold" style={{ color: record.noPR > 0 ? 'var(--coral)' : 'var(--text-3)' }}>
                  {record.noPR}
                </td>
                <td className="px-[14px] py-[10px] text-[13px] font-semibold" style={{ color: record.unregisteredPRs > 0 ? 'var(--amber)' : 'var(--text-3)' }}>
                  {record.unregisteredPRs}
                </td>
                <td className="px-[14px] py-[10px] text-right">
                  <span className="text-[11px] font-medium" style={{ color: 'var(--accent)' }}>View →</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
