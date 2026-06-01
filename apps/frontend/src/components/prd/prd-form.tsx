'use client'

import { useState } from 'react'
import { useProjectStore } from '@/stores/project-store'
import type { PrdRunRecord } from '@/types/prd'

interface PrdFormProps {
  onRunComplete?: (record: PrdRunRecord) => void
}

export function PrdForm({ onRunComplete }: PrdFormProps) {
  const projects = useProjectStore((s) => s.projects)

  const [projectId, setProjectId]       = useState('')
  const [targetTeam, setTargetTeam]     = useState('')
  const [kickoffUrl, setKickoffUrl]     = useState('')
  const [prdPageUrl, setPrdPageUrl]     = useState('')
  const [isRunning, setIsRunning]       = useState(false)

  const canRun = projectId !== '' && targetTeam.trim() !== '' && kickoffUrl.trim() !== '' && prdPageUrl.trim() !== ''

  const handleRun = () => {
    if (!canRun) return

    const selectedProject = projects.find((p) => p.id === projectId)
    if (!selectedProject) return

    const newRecord: PrdRunRecord = {
      id: `prd-${Date.now()}`,
      projectId,
      projectName: selectedProject.name,
      prdPageUrl: prdPageUrl.trim(),
      requestedAt: nowStr(),
      status: 'running',
      confluenceUrl: null,
    }

    setIsRunning(true)

    setTimeout(() => {
      const completedRecord: PrdRunRecord = { ...newRecord, status: 'done', confluenceUrl: prdPageUrl.trim() }
      setIsRunning(false)
      onRunComplete?.(completedRecord)
    }, 2500)
  }

  return (
    <div className="max-w-[780px]">
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
          {/* Project */}
          <Field label="Project" required>
            <select
              data-testid="project-select"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-[6px] px-[10px] py-2 text-[13px] outline-none"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-md)',
                color: projectId === '' ? 'var(--text-3)' : 'var(--text-1)',
              }}
            >
              <option value="">— Select project —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>

          {/* Target Team */}
          <Field label="Target Team" required>
            <input
              type="text"
              data-testid="target-team-input"
              value={targetTeam}
              onChange={(e) => setTargetTeam(e.target.value)}
              placeholder="e.g. ODM Team, MDM Team"
              className="w-full rounded-[6px] px-[10px] py-2 text-[13px] outline-none"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-md)',
                color: 'var(--text-1)',
              }}
            />
          </Field>

          {/* Kickoff URL */}
          <Field label="Kickoff Confluence URL" required hint="Automatically parses Overview, Scope, Requirements, etc. from the Kickoff document.">
            <input
              type="url"
              data-testid="kickoff-url-input"
              value={kickoffUrl}
              onChange={(e) => setKickoffUrl(e.target.value)}
              placeholder="https://lunit.atlassian.net/wiki/spaces/..."
              className="w-full rounded-[6px] px-[10px] py-2 text-[13px] outline-none"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-md)',
                color: 'var(--text-1)',
              }}
            />
          </Field>

          {/* PRD Page URL */}
          <Field label="PRD Page URL (Update Target)" required hint="Existing PRD Confluence page URL. Content will be filled in on this page.">
            <input
              type="url"
              data-testid="prd-page-url-input"
              value={prdPageUrl}
              onChange={(e) => setPrdPageUrl(e.target.value)}
              placeholder="https://lunit.atlassian.net/wiki/spaces/..."
              className="w-full rounded-[6px] px-[10px] py-2 text-[13px] outline-none"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-md)',
                color: 'var(--text-1)',
              }}
            />
          </Field>
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

interface FieldProps {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}

function Field({ label, required, hint, children }: FieldProps) {
  return (
    <div>
      <label className="block text-[11px] font-semibold mb-[5px]" style={{ color: 'var(--text-2)' }}>
        {label}{' '}
        {required && (
          <span
            className="text-[11px] font-normal px-[6px] py-[1px] rounded-[6px]"
            style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
          >
            Required
          </span>
        )}
      </label>
      {children}
      {hint && (
        <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>
          {hint}
        </p>
      )}
    </div>
  )
}

function nowStr(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
