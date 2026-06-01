'use client'

import { useState } from 'react'
import { runSprintReport } from '@/api/sprint-reports'
import type { SprintOption, SprintRunRecord } from '@/types/sprint'

interface SprintReportFormProps {
  sprintOptions: SprintOption[]
  onRunComplete?: (record: SprintRunRecord) => void
}

export function SprintReportForm({ sprintOptions, onRunComplete }: SprintReportFormProps) {
  const [selectedSprintId, setSelectedSprintId] = useState('')
  const [confluenceUrl, setConfluenceUrl] = useState('')
  const [spGoal, setSpGoal] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedSprint = sprintOptions.find((s) => s.sprintId === Number(selectedSprintId))
  const canRun = !!selectedSprint && confluenceUrl.trim() !== ''

  const handleRun = async () => {
    if (!canRun || !selectedSprint) return
    setIsRunning(true)
    setError(null)
    try {
      const payload: Parameters<typeof runSprintReport>[0] = {
        sprint_id: selectedSprint.sprintId,
        sprint_number: selectedSprint.sprintNumber,
        sprint_label: selectedSprint.label,
        confluence_page_url: confluenceUrl.trim(),
      }
      if (spGoal.trim()) payload.sp_goal = Number(spGoal)
      const record = await runSprintReport(payload)
      onRunComplete?.(record)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsRunning(false)
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
          {/* Sprint select */}
          <div>
            <label className="block text-[11px] font-semibold mb-[5px]" style={{ color: 'var(--text-2)' }}>
              Jira Sprint{' '}
              <span
                className="text-[11px] font-normal px-[6px] py-[1px] rounded-[6px]"
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
                color: selectedSprintId ? 'var(--text-1)' : 'var(--text-3)',
              }}
            >
              <option value="">— Select sprint —</option>
              {sprintOptions.map((sprint) => (
                <option key={sprint.sprintId} value={sprint.sprintId}>
                  {sprint.label} ({sprint.status === 'active' ? 'Active' : 'Closed'})
                </option>
              ))}
            </select>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>
              Issues are auto-collected from the Jira board sprint.
            </p>
          </div>

          {/* Confluence page URL */}
          <div>
            <label className="block text-[11px] font-semibold mb-[5px]" style={{ color: 'var(--text-2)' }}>
              Confluence Page URL{' '}
              <span
                className="text-[11px] font-normal px-[6px] py-[1px] rounded-[6px]"
                style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
              >
                Required
              </span>
            </label>
            <input
              type="url"
              data-testid="confluence-url-input"
              value={confluenceUrl}
              onChange={(e) => setConfluenceUrl(e.target.value)}
              placeholder="https://lunit.atlassian.net/wiki/spaces/AIP/pages/..."
              className="w-full rounded-[6px] px-[10px] py-2 text-[13px] outline-none"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-md)',
                color: 'var(--text-1)',
              }}
            />
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>
              Sprint Summary and Key Deliverables sections will be updated in-place.
            </p>
          </div>

          {/* SP Goal */}
          <div>
            <label className="block text-[11px] font-semibold mb-[5px]" style={{ color: 'var(--text-2)' }}>
              SP Goal{' '}
              <span className="text-[11px] font-normal" style={{ color: 'var(--text-3)' }}>
                (optional)
              </span>
            </label>
            <input
              type="number"
              min="0"
              data-testid="sp-goal-input"
              value={spGoal}
              onChange={(e) => setSpGoal(e.target.value)}
              placeholder="e.g. 140"
              className="w-[120px] rounded-[6px] px-[10px] py-2 text-[13px] outline-none"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-md)',
                color: 'var(--text-1)',
              }}
            />
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>
              Planned sprint capacity. Enables Sprint Completion Rate above the table.
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p
          className="text-[12px] mb-3 px-3 py-2 rounded-[8px]"
          style={{ background: '#FAECE7', color: '#993C1D' }}
          data-testid="run-error"
        >
          {error}
        </p>
      )}

      {/* Run button */}
      <div className="flex justify-end">
        <button
          type="button"
          data-testid="run-btn"
          onClick={() => { void handleRun() }}
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
