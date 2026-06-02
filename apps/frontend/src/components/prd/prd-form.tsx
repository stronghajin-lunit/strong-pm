'use client'

import { useEffect, useState } from 'react'
import { fetchPrdTeams, runPrd } from '@/api/prd'
import type { PrdTeamOption } from '@/api/prd'
import { useProjectStore } from '@/stores/project-store'
import type { PrdRunRecord } from '@/types/prd'

interface PrdFormProps {
  onRunComplete?: (record: PrdRunRecord) => void
}

export function PrdForm({ onRunComplete }: PrdFormProps) {
  const projects = useProjectStore((s) => s.projects)

  const [projectId, setProjectId]   = useState('')
  const [targetTeam, setTargetTeam] = useState('')
  const [kickoffUrl, setKickoffUrl] = useState('')
  const [prdPageUrl, setPrdPageUrl] = useState('')
  const [teams, setTeams]           = useState<PrdTeamOption[]>([])
  const [isRunning, setIsRunning]   = useState(false)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    void fetchPrdTeams().then(setTeams).catch(() => setTeams([]))
  }, [])

  const selectedTeam = teams.find((t) => t.label === targetTeam)
  const canRun = projectId !== '' && targetTeam !== '' && kickoffUrl.trim() !== '' && prdPageUrl.trim() !== ''

  const handleRun = async () => {
    if (!canRun) return
    setIsRunning(true)
    setError(null)
    try {
      const record = await runPrd({
        project_id: projectId,
        target_team: targetTeam,
        kickoff_url: kickoffUrl.trim(),
        prd_page_url: prdPageUrl.trim(),
      })
      onRunComplete?.(record)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="max-w-[780px]">
      <div className="rounded-[12px] p-5 mb-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-[14px]" style={{ color: 'var(--text-3)' }}>
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
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)', color: projectId === '' ? 'var(--text-3)' : 'var(--text-1)' }}
            >
              <option value="">— Select project —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>

          {/* Target Team */}
          <Field label="Target Team" required hint={selectedTeam?.description}>
            <select
              data-testid="target-team-select"
              value={targetTeam}
              onChange={(e) => setTargetTeam(e.target.value)}
              className="w-full rounded-[6px] px-[10px] py-2 text-[13px] outline-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)', color: targetTeam === '' ? 'var(--text-3)' : 'var(--text-1)' }}
            >
              <option value="">— Select team —</option>
              {teams.map((t) => (
                <option key={t.key} value={t.label}>{t.label}</option>
              ))}
            </select>
          </Field>

          {/* Kickoff URL */}
          <Field label="Kickoff Confluence URL" required hint="AI parses Overview, Scope, Requirements, etc. from this document.">
            <input
              type="url"
              data-testid="kickoff-url-input"
              value={kickoffUrl}
              onChange={(e) => setKickoffUrl(e.target.value)}
              placeholder="https://lunit.atlassian.net/wiki/spaces/..."
              className="w-full rounded-[6px] px-[10px] py-2 text-[13px] outline-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)', color: 'var(--text-1)' }}
            />
          </Field>

          {/* PRD Page URL */}
          <Field label="PRD Page URL" required hint="Existing PRD Confluence page. Content will be filled in without changing the format.">
            <input
              type="url"
              data-testid="prd-page-url-input"
              value={prdPageUrl}
              onChange={(e) => setPrdPageUrl(e.target.value)}
              placeholder="https://lunit.atlassian.net/wiki/spaces/..."
              className="w-full rounded-[6px] px-[10px] py-2 text-[13px] outline-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)', color: 'var(--text-1)' }}
            />
          </Field>
        </div>
      </div>

      {error && (
        <p className="text-[12px] mb-3 px-3 py-2 rounded-[8px]" style={{ background: '#FAECE7', color: '#993C1D' }}>
          {error}
        </p>
      )}

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
          <span className="text-[11px] font-normal px-[6px] py-[1px] rounded-[6px]" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            Required
          </span>
        )}
      </label>
      {children}
      {hint && <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>{hint}</p>}
    </div>
  )
}
