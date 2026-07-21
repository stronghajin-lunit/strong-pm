'use client'

import { useState, useRef, useEffect } from 'react'
import { runFeatureList } from '@/api/feature-list'
import type { FeatureListRun } from '@/api/feature-list'
import { useProjectStore } from '@/stores/project-store'

type ContextPosition = 'beginning' | 'middle' | 'end'

interface SourceConfig {
  position: ContextPosition
  charLimit: number
}

interface ContextConfig {
  projectSummary: SourceConfig
  prdPages: SourceConfig
  referenceDocs: SourceConfig
}

const DEFAULT_CONTEXT_CONFIG: ContextConfig = {
  projectSummary: { position: 'beginning', charLimit: 1500 },
  prdPages: { position: 'middle', charLimit: 10000 },
  referenceDocs: { position: 'end', charLimit: 10000 },
}

const CONTEXT_SOURCES: { key: keyof ContextConfig; label: string }[] = [
  { key: 'projectSummary', label: 'Project Summary' },
  { key: 'prdPages', label: 'PRD & Child Pages' },
  { key: 'referenceDocs', label: 'Reference Docs' },
]

const POSITION_GUIDE: { value: ContextPosition; label: string; color: string; desc: string }[] = [
  {
    value: 'beginning',
    label: 'Beginning',
    color: '#3B82F6',
    desc: 'Sets the interpretive frame for the model. Best for background and summary content.',
  },
  {
    value: 'middle',
    label: 'Middle',
    color: '#F59E0B',
    desc: 'The main content zone. Ideal for large source documents. Longer contexts may reduce attention here.',
  },
  {
    value: 'end',
    label: 'End',
    color: '#10B981',
    desc: 'Processed just before generation — most directly influences output. Best for documents you want strongly reflected.',
  },
]

interface FeatureListFormProps {
  onRun?: (temp: FeatureListRun, promise: Promise<FeatureListRun>) => void
}

export function FeatureListForm({ onRun }: FeatureListFormProps) {
  const projects = useProjectStore((s) => s.projects)

  const [projectId, setProjectId] = useState('')
  const [prdPageUrl, setPrdPageUrl] = useState('')
  const [featureListPageUrl, setFeatureListPageUrl] = useState('')
  const [referenceUrls, setReferenceUrls] = useState<string[]>([])
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [contextConfig, setContextConfig] = useState<ContextConfig>(DEFAULT_CONTEXT_CONFIG)
  const [positionPopoverOpen, setPositionPopoverOpen] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const popoverRef = useRef<HTMLDivElement>(null)
  const infoButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!positionPopoverOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current?.contains(e.target as Node) ||
        infoButtonRef.current?.contains(e.target as Node)
      )
        return
      setPositionPopoverOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [positionPopoverOpen])

  const canRun = projectId !== '' && prdPageUrl.trim() !== '' && featureListPageUrl.trim() !== ''

  const addReferenceUrl = () => setReferenceUrls((prev) => [...prev, ''])
  const removeReferenceUrl = (i: number) =>
    setReferenceUrls((prev) => prev.filter((_, idx) => idx !== i))
  const updateReferenceUrl = (i: number, value: string) =>
    setReferenceUrls((prev) => prev.map((url, idx) => (idx === i ? value : url)))

  const handlePositionChange = (source: keyof ContextConfig, newPosition: ContextPosition) => {
    setContextConfig((prev) => {
      const currentPosition = prev[source].position
      const conflicting = (Object.keys(prev) as (keyof ContextConfig)[]).find(
        (k) => k !== source && prev[k].position === newPosition,
      )
      if (!conflicting) return { ...prev, [source]: { ...prev[source], position: newPosition } }
      return {
        ...prev,
        [source]: { ...prev[source], position: newPosition },
        [conflicting]: { ...prev[conflicting], position: currentPosition },
      }
    })
  }

  const handleCharLimitChange = (source: keyof ContextConfig, raw: string) => {
    const parsed = parseInt(raw, 10)
    if (!isNaN(parsed) && parsed >= 0) {
      const val = Math.max(500, Math.min(20000, parsed))
      setContextConfig((prev) => ({ ...prev, [source]: { ...prev[source], charLimit: val } }))
    }
  }

  const handleCharLimitBlur = (source: keyof ContextConfig, raw: string) => {
    const val = Math.max(500, Math.min(20000, parseInt(raw, 10) || 500))
    setContextConfig((prev) => ({ ...prev, [source]: { ...prev[source], charLimit: val } }))
  }

  const handleRun = () => {
    if (!canRun) return
    setIsRunning(true)
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const tempRecord: FeatureListRun = {
      id: `temp-${Date.now()}`,
      projectId: projectId || null,
      projectName: projects.find((p) => p.id === projectId)?.name ?? '',
      prdPageUrl: prdPageUrl.trim(),
      featureListPageUrl: featureListPageUrl.trim(),
      requestedAt: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`,
      status: 'running',
      confluenceUrl: null,
      featureCount: null,
    }
    const promise = runFeatureList({
      project_id: projectId,
      prd_page_url: prdPageUrl.trim(),
      feature_list_page_url: featureListPageUrl.trim(),
      reference_urls: referenceUrls.filter((url) => url.trim() !== ''),
      context_config: {
        project_summary: {
          position: contextConfig.projectSummary.position,
          char_limit: contextConfig.projectSummary.charLimit,
        },
        prd_pages: {
          position: contextConfig.prdPages.position,
          char_limit: contextConfig.prdPages.charLimit,
        },
        reference_docs: {
          position: contextConfig.referenceDocs.position,
          char_limit: contextConfig.referenceDocs.charLimit,
        },
      },
    })
    onRun?.(tempRecord, promise)
  }

  return (
    <div className="max-w-[780px]">
      {/* Main configuration */}
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
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="PRD Page URL"
            required
            hint="Source document. PRD page and all its child pages will be parsed."
          >
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

          <Field
            label="Feature List Page URL"
            required
            hint="Existing Feature List Confluence page. Overview and Feature table will be filled in without changing the format."
          >
            <input
              type="url"
              data-testid="feature-list-page-url-input"
              value={featureListPageUrl}
              onChange={(e) => setFeatureListPageUrl(e.target.value)}
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

      {/* Advanced Options */}
      <div
        className="rounded-[12px] mb-3"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-[13px]"
        >
          <div className="flex items-center gap-[7px]">
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.06em]"
              style={{ color: 'var(--text-3)' }}
            >
              Advanced Options
            </span>
            <span
              className="text-[9px] font-bold uppercase px-[5px] py-[1px] rounded-[4px]"
              style={{ background: '#EDE9FE', color: '#7C3AED' }}
            >
              beta
            </span>
          </div>
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            width="12"
            height="12"
            className="transition-transform duration-200"
            style={{
              color: 'var(--text-3)',
              transform: advancedOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            <path d="M3 6l5 5 5-5" />
          </svg>
        </button>

        {advancedOpen && (
          <div style={{ borderTop: '1px solid var(--border)' }}>
            {/* Reference Documents */}
            <div className="px-5 pt-4 pb-4">
              <div className="flex items-baseline gap-[6px] mb-[10px]">
                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-2)' }}>
                  Reference Documents
                </span>
                <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                  optional
                </span>
              </div>
              <p className="text-[11px] mb-3" style={{ color: 'var(--text-3)' }}>
                Confluence pages to include as high-priority reference context. Added to the end of
                context by default.
              </p>
              <div className="flex flex-col gap-2">
                {referenceUrls.map((url, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => updateReferenceUrl(i, e.target.value)}
                      placeholder="https://lunit.atlassian.net/wiki/spaces/..."
                      className="flex-1 rounded-[6px] px-[10px] py-2 text-[13px] outline-none"
                      style={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border-md)',
                        color: 'var(--text-1)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeReferenceUrl(i)}
                      className="flex items-center justify-center w-[30px] h-[30px] rounded-[6px] flex-shrink-0 transition-opacity hover:opacity-70"
                      style={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border-md)',
                        color: 'var(--text-3)',
                      }}
                    >
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        width="10"
                        height="10"
                      >
                        <path d="M3 3l10 10M13 3L3 13" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addReferenceUrl}
                  className="flex items-center gap-[5px] self-start text-[12px] font-medium px-3 py-[5px] rounded-[6px] transition-opacity hover:opacity-80"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border-md)',
                    color: 'var(--text-2)',
                  }}
                >
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    width="10"
                    height="10"
                  >
                    <path d="M8 3v10M3 8h10" />
                  </svg>
                  Add Reference
                </button>
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px solid var(--border)' }} />

            {/* Context Configuration */}
            <div className="px-5 pt-4 pb-5">
              <div className="text-[11px] font-semibold mb-3" style={{ color: 'var(--text-2)' }}>
                Context Configuration
              </div>

              {/* Header row */}
              <div
                className="grid items-center gap-x-3 mb-[6px]"
                style={{ gridTemplateColumns: '1fr 136px 168px' }}
              >
                <div
                  className="text-[10px] font-semibold uppercase tracking-[0.05em]"
                  style={{ color: 'var(--text-3)' }}
                >
                  Source
                </div>
                <div
                  className="flex items-center gap-[5px] text-[10px] font-semibold uppercase tracking-[0.05em]"
                  style={{ color: 'var(--text-3)' }}
                >
                  Position
                  <div className="relative">
                    <button
                      ref={infoButtonRef}
                      type="button"
                      onClick={() => setPositionPopoverOpen((v) => !v)}
                      className="flex items-center justify-center w-[14px] h-[14px] rounded-full transition-opacity hover:opacity-70"
                      style={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border-md)',
                        color: 'var(--text-3)',
                        fontSize: '8px',
                        fontWeight: 700,
                        lineHeight: 1,
                      }}
                    >
                      i
                    </button>
                    {positionPopoverOpen && (
                      <div
                        ref={popoverRef}
                        className="absolute z-50 w-[264px] rounded-[10px] p-4"
                        style={{
                          top: '18px',
                          left: '0',
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                        }}
                      >
                        <div
                          className="text-[11px] font-semibold mb-3"
                          style={{ color: 'var(--text-1)' }}
                        >
                          Context Position Guide
                        </div>
                        {POSITION_GUIDE.map(({ label, color, desc }) => (
                          <div key={label} className="mb-3 last:mb-0">
                            <div className="flex items-center gap-[6px] mb-[3px]">
                              <div
                                className="w-[6px] h-[6px] rounded-full flex-shrink-0"
                                style={{ background: color }}
                              />
                              <span
                                className="text-[11px] font-semibold"
                                style={{ color: 'var(--text-1)' }}
                              >
                                {label}
                              </span>
                            </div>
                            <p
                              className="text-[11px] leading-[1.5] pl-3"
                              style={{ color: 'var(--text-3)' }}
                            >
                              {desc}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div
                  className="text-[10px] font-semibold uppercase tracking-[0.05em]"
                  style={{ color: 'var(--text-3)' }}
                >
                  Total Char Limit
                </div>
              </div>

              {/* Source rows */}
              <div className="flex flex-col gap-[6px]">
                {CONTEXT_SOURCES.map(({ key, label }) => (
                  <div
                    key={key}
                    className="grid items-center gap-x-3"
                    style={{ gridTemplateColumns: '1fr 136px 168px' }}
                  >
                    <div className="text-[12px]" style={{ color: 'var(--text-1)' }}>
                      {label}
                    </div>
                    <select
                      value={contextConfig[key].position}
                      onChange={(e) =>
                        handlePositionChange(key, e.target.value as ContextPosition)
                      }
                      className="w-full rounded-[6px] px-[8px] py-[5px] text-[12px] outline-none"
                      style={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border-md)',
                        color: 'var(--text-1)',
                      }}
                    >
                      <option value="beginning">Beginning</option>
                      <option value="middle">Middle</option>
                      <option value="end">End</option>
                    </select>
                    <div className="flex items-center gap-[6px]">
                      <input
                        type="number"
                        min={500}
                        max={20000}
                        value={contextConfig[key].charLimit}
                        onChange={(e) => handleCharLimitChange(key, e.target.value)}
                        onBlur={(e) => handleCharLimitBlur(key, e.target.value)}
                        className="w-[80px] rounded-[6px] px-[8px] py-[5px] text-[12px] outline-none"
                        style={{
                          background: 'var(--surface-2)',
                          border: '1px solid var(--border-md)',
                          color: 'var(--text-1)',
                        }}
                      />
                      <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                        chars
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p
          className="text-[12px] mb-3 px-3 py-2 rounded-[8px]"
          style={{ background: '#FAECE7', color: '#993C1D' }}
        >
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          data-testid="run-btn"
          onClick={() => {
            void handleRun()
          }}
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
