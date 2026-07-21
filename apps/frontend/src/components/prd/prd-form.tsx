'use client'

import { useEffect, useRef, useState } from 'react'
import { fetchPrdTeams, runPrd } from '@/api/prd'
import type { PrdTeamOption } from '@/api/prd'
import { useProjectStore } from '@/stores/project-store'
import type { PrdRunRecord } from '@/types/prd'

interface PrdFormProps {
  onRun?: (temp: PrdRunRecord, promise: Promise<PrdRunRecord>) => void
}

export function PrdForm({ onRun }: PrdFormProps) {
  const projects = useProjectStore((s) => s.projects)

  const [projectId, setProjectId]         = useState('')
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false)
  const [kickoffUrl, setKickoffUrl]       = useState('')
  const [prdPageUrl, setPrdPageUrl]       = useState('')
  const [teams, setTeams]                 = useState<PrdTeamOption[]>([])
  const [isRunning, setIsRunning]         = useState(false)
  const [error, setError]                 = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void fetchPrdTeams().then(setTeams).catch(() => setTeams([]))
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTeamDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const toggleTeam = (label: string) => {
    setSelectedTeams((prev) =>
      prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label],
    )
  }

  const canRun = projectId !== '' && selectedTeams.length > 0 && kickoffUrl.trim() !== '' && prdPageUrl.trim() !== ''

  const handleRun = () => {
    if (!canRun) return
    setIsRunning(true)
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const tempRecord: PrdRunRecord = {
      id: `temp-${Date.now()}`,
      projectId,
      projectName: projects.find((p) => p.id === projectId)?.name ?? '',
      targetTeams: selectedTeams,
      kickoffUrl: kickoffUrl.trim(),
      prdPageUrl: prdPageUrl.trim(),
      requestedAt: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`,
      status: 'running',
      confluenceUrl: null,
    }
    const promise = runPrd({
      project_id: projectId,
      target_teams: selectedTeams,
      kickoff_url: kickoffUrl.trim(),
      prd_page_url: prdPageUrl.trim(),
    })
    onRun?.(tempRecord, promise)
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

          {/* Target Team — multi-select dropdown */}
          <div>
            <label className="block text-[11px] font-semibold mb-[5px]" style={{ color: 'var(--text-2)' }}>
              Target Team{' '}
              <span className="text-[11px] font-normal px-[6px] py-[1px] rounded-[6px]" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                Required
              </span>
            </label>

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                data-testid="target-team-btn"
                onClick={() => setTeamDropdownOpen((o) => !o)}
                className="w-full flex items-center justify-between rounded-[6px] px-[10px] py-2 text-[13px] outline-none text-left"
                style={{
                  background: 'var(--surface-2)',
                  border: selectedTeams.length > 0 ? '1px solid var(--accent)' : '1px solid var(--border-md)',
                  color: selectedTeams.length > 0 ? 'var(--text-1)' : 'var(--text-3)',
                }}
              >
                <span className="truncate">
                  {selectedTeams.length === 0
                    ? '— Select teams —'
                    : selectedTeams.length === 1
                    ? selectedTeams[0]
                    : `${selectedTeams.length} teams selected`}
                </span>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="10" height="10"
                  style={{ transform: teamDropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s', flexShrink: 0 }}>
                  <path d="M4 6l4 4 4-4" />
                </svg>
              </button>

              {teamDropdownOpen && (
                <div className="absolute left-0 top-[calc(100%+4px)] z-20 w-full rounded-[8px] py-1 max-h-[280px] overflow-y-auto"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border-md)', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                  {selectedTeams.length > 0 && (
                    <>
                      <button type="button" onClick={() => setSelectedTeams([])}
                        className="w-full text-left px-[12px] py-[6px] text-[11px] font-medium hover:opacity-70"
                        style={{ color: 'var(--accent)' }}>
                        Clear all
                      </button>
                      <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
                    </>
                  )}
                  {teams.map((t) => {
                    const selected = selectedTeams.includes(t.label)
                    return (
                      <button key={t.key} type="button" onClick={() => toggleTeam(t.label)}
                        className="w-full flex items-start gap-[8px] px-[12px] py-[8px] text-left hover:opacity-80">
                        <span className="w-[14px] h-[14px] rounded-[3px] border flex items-center justify-center shrink-0 mt-[1px]"
                          style={{ background: selected ? 'var(--accent)' : 'transparent', borderColor: selected ? 'var(--accent)' : 'var(--border-md)' }}>
                          {selected && (
                            <svg viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="1.5" width="8" height="8">
                              <path d="M1.5 5l2.5 2.5 4.5-4" />
                            </svg>
                          )}
                        </span>
                        <div>
                          <div className="text-[12px] font-medium" style={{ color: 'var(--text-1)' }}>{t.label}</div>
                          <div className="text-[11px] mt-[2px]" style={{ color: 'var(--text-3)' }}>{t.description}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Selected team tags */}
            {selectedTeams.length > 0 && (
              <div className="flex flex-wrap gap-[6px] mt-[8px]">
                {selectedTeams.map((label) => (
                  <span key={label}
                    className="flex items-center gap-[4px] text-[11px] font-medium px-[8px] py-[3px] rounded-[6px]"
                    style={{ background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid transparent' }}>
                    {label}
                    <button type="button" onClick={() => toggleTeam(label)} className="hover:opacity-70">
                      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" width="10" height="10">
                        <path d="M2 2l8 8M10 2L2 10" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

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
