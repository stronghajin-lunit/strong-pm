'use client'

import { useState } from 'react'
import type { SprintOption, SprintRunRecord } from '@/types/sprint'

interface SprintReportFormProps {
  sprintOptions: SprintOption[]
  onRunComplete?: (record: SprintRunRecord) => void
}

export function SprintReportForm({ sprintOptions, onRunComplete }: SprintReportFormProps) {
  const [selectedSprintId, setSelectedSprintId] = useState('')
  const [isRunning, setIsRunning] = useState(false)

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

    setIsRunning(true)

    setTimeout(() => {
      const completedRecord: SprintRunRecord = { ...newRecord, status: 'done', confluenceUrl: '#' }
      setIsRunning(false)
      onRunComplete?.(completedRecord)
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
          className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-[14px]"
          style={{ color: 'var(--text-3)' }}
        >
          Configuration
        </div>

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
      <div className="flex justify-end">
        <button
          type="button"
          data-testid="run-btn"
          onClick={handleRun}
          disabled={!selectedSprintId || isRunning}
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

function nowStr(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
