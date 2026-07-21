'use client'

import { useEffect, useRef, useState } from 'react'
import { useProjectStore } from '@/stores/project-store'
import { useUIStore } from '@/stores/ui-store'
import {
  getProjectContext,
  previewContextSync,
  saveProjectContext,
} from '@/api/project-context'
import type { Project } from '@/types/project'

// ─── Diff ────────────────────────────────────────────────────────────────────

interface DiffLine {
  type: 'unchanged' | 'added' | 'removed'
  content: string
}

interface DiffSection {
  title: string
  lines: DiffLine[]
  hasChanges: boolean
}

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split('\n')
  const b = newText.split('\n')
  const m = a.length, n = b.length

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])

  const result: DiffLine[] = []
  let i = m, j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({ type: 'unchanged', content: a[i - 1] })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', content: b[j - 1] })
      j--
    } else {
      result.unshift({ type: 'removed', content: a[i - 1] })
      i--
    }
  }
  return result
}

function groupDiffBySections(diffLines: DiffLine[]): DiffSection[] | null {
  const hasSectionHeaders = diffLines.some((l) => l.content.startsWith('## '))
  if (!hasSectionHeaders) return null

  const sections: DiffSection[] = []
  let current: DiffSection | null = null

  for (const line of diffLines) {
    if (line.content.startsWith('## ')) {
      if (current) sections.push(current)
      current = {
        title: line.content.slice(3),
        lines: [line],
        hasChanges: line.type !== 'unchanged',
      }
    } else {
      if (!current) current = { title: '', lines: [], hasChanges: false }
      current.lines.push(line)
      if (line.type !== 'unchanged') current.hasChanges = true
    }
  }
  if (current) sections.push(current)
  return sections
}

// ─── Types ───────────────────────────────────────────────────────────────────

type PanelMode = 'loading' | 'edit' | 'syncing' | 'diff'

interface ContextMeta {
  pageCount: number
  syncedAt: string | null
}

interface PendingDiff {
  diffLines: DiffLine[]
  newContext: string
  newContextKo: string
  pageCount: number
  preSyncContent: string
  changedPageTitles: string[]
}

interface ProjectState {
  editContent: string
  contextKo: string | null
  meta: ContextMeta | null
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ProjectContextPage() {
  const setTopbarTitle = useUIStore((s) => s.setTopbarTitle)
  const projects = useProjectStore((s) => s.projects)
  const loadProjects = useProjectStore((s) => s.loadProjects)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mode, setMode] = useState<PanelMode>('edit')
  const [editContent, setEditContent] = useState('')
  const [contextKo, setContextKo] = useState<string | null>(null)
  const [diffLines, setDiffLines] = useState<DiffLine[]>([])
  const [changedPageTitles, setChangedPageTitles] = useState<string[]>([])
  const [meta, setMeta] = useState<ContextMeta | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [koreanOpen, setKoreanOpen] = useState(false)

  // Per-project sync tracking (survives project switching)
  const [syncingProjects, setSyncingProjects] = useState<Set<string>>(new Set())
  const pendingDiffsRef = useRef<Map<string, PendingDiff>>(new Map())
  const projectStatesRef = useRef<Map<string, ProjectState>>(new Map())
  const selectedIdRef = useRef<string | null>(null)

  useEffect(() => {
    setTopbarTitle('Project Context')
    if (projects.length === 0) void loadProjects()
  }, [setTopbarTitle, loadProjects])

  const activeProjects = projects.filter((p) => p.status !== 'done')
  const selectedProject = activeProjects.find((p) => p.id === selectedId) ?? null

  // Keep ref in sync so async callbacks always see the latest selectedId
  selectedIdRef.current = selectedId

  const handleSelect = async (project: Project) => {
    setSelectedId(project.id)
    selectedIdRef.current = project.id
    setKoreanOpen(false)
    setError(null)

    // Restore pending diff if sync completed while away
    const pending = pendingDiffsRef.current.get(project.id)
    if (pending) {
      setEditContent(pending.newContext)
      setContextKo(pending.newContextKo)
      setDiffLines(pending.diffLines)
      setChangedPageTitles(pending.changedPageTitles)
      setMode('diff')
      return
    }

    // Restore syncing state if still in progress
    if (syncingProjects.has(project.id)) {
      const saved = projectStatesRef.current.get(project.id)
      setEditContent(saved?.editContent ?? '')
      setContextKo(saved?.contextKo ?? null)
      setMeta(saved?.meta ?? null)
      setDiffLines([])
      setMode('syncing')
      return
    }

    // Normal load from API
    setMode('loading')
    setDiffLines([])
    try {
      const data = await getProjectContext(project.id)
      setEditContent(data.context ?? '')
      setContextKo(data.context_ko)
      setMeta({ pageCount: data.page_count, syncedAt: data.synced_at })
      projectStatesRef.current.set(project.id, {
        editContent: data.context ?? '',
        contextKo: data.context_ko,
        meta: { pageCount: data.page_count, syncedAt: data.synced_at },
      })
      setMode('edit')
    } catch {
      setEditContent('')
      setContextKo(null)
      setMeta(null)
      setMode('edit')
    }
  }

  const handleSync = async () => {
    if (!selectedProject) return
    const projectId = selectedProject.id

    // Save current state so we can restore it when switching back
    projectStatesRef.current.set(projectId, { editContent, contextKo, meta })

    setSyncingProjects((prev) => new Set([...prev, projectId]))
    setMode('syncing')
    setError(null)

    try {
      const data = await previewContextSync(projectId)
      const diff: PendingDiff = {
        diffLines: computeDiff(data.old_context ?? '', data.new_context),
        newContext: data.new_context,
        newContextKo: data.new_context_ko,
        pageCount: data.page_count,
        preSyncContent: editContent,
        changedPageTitles: data.changed_page_titles ?? [],
      }

      setSyncingProjects((prev) => { const n = new Set(prev); n.delete(projectId); return n })

      // If still viewing this project, apply immediately; otherwise store for later
      if (selectedIdRef.current === projectId) {
        setDiffLines(diff.diffLines)
        setChangedPageTitles(diff.changedPageTitles)
        setEditContent(diff.newContext)
        setContextKo(diff.newContextKo)
        setMeta((prev) => ({ pageCount: diff.pageCount, syncedAt: prev?.syncedAt ?? null }))
        setMode('diff')
      } else {
        pendingDiffsRef.current.set(projectId, diff)
      }
    } catch (e) {
      setSyncingProjects((prev) => { const n = new Set(prev); n.delete(projectId); return n })
      if (selectedIdRef.current === projectId) {
        setError(e instanceof Error ? e.message : 'Sync failed')
        setMode('edit')
      }
    }
  }

  const handleApply = async () => {
    if (!selectedProject || saving) return
    setError(null)
    setSaving(true)
    try {
      const data = await saveProjectContext(selectedProject.id, editContent, true)
      setMeta({ pageCount: data.page_count, syncedAt: data.synced_at })
      setContextKo(data.context_ko)
      pendingDiffsRef.current.delete(selectedProject.id)
      setMode('edit')
      setDiffLines([])
      setChangedPageTitles([])
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    if (!selectedProject || saving) return
    setError(null)
    setSaving(true)
    try {
      const data = await saveProjectContext(selectedProject.id, editContent)
      setMeta({ pageCount: data.page_count, syncedAt: data.synced_at })
      setContextKo(data.context_ko)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelSync = () => {
    const saved = projectStatesRef.current.get(selectedId ?? '')
    setEditContent(saved?.editContent ?? '')
    pendingDiffsRef.current.delete(selectedId ?? '')
    setMode('edit')
    setDiffLines([])
    setChangedPageTitles([])
  }

  const changedLines = diffLines.filter((l) => l.type !== 'unchanged').length

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Project list ───────────────────────────────────────── */}
      <aside
        className="w-[220px] shrink-0 flex flex-col overflow-hidden"
        style={{ borderRight: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <div
          className="px-4 py-[11px] text-[11px] font-semibold uppercase tracking-[0.07em]"
          style={{ color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}
        >
          Projects
        </div>
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-[2px]">
          {activeProjects.map((project) => {
            const active = selectedId === project.id
            const isSyncing = syncingProjects.has(project.id)
            const hasPending = pendingDiffsRef.current.has(project.id)
            return (
              <button
                key={project.id}
                type="button"
                onClick={() => void handleSelect(project)}
                className="w-full flex items-center gap-2 px-3 py-[7px] rounded-[8px] text-left text-[13px] font-medium transition-colors"
                style={
                  active
                    ? { background: 'var(--accent-light)', color: 'var(--accent)' }
                    : { color: 'var(--text-2)' }
                }
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = 'var(--surface-2)'
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = ''
                }}
              >
                {isSyncing ? (
                  <SyncSpinner />
                ) : (
                  <span
                    className="w-[7px] h-[7px] rounded-full shrink-0"
                    style={{
                      background: project.status === 'active' ? 'var(--teal)' : 'var(--amber)',
                    }}
                  />
                )}
                <span className="flex-1 truncate">{project.name}</span>
                {hasPending && !active && (
                  <span
                    className="w-[6px] h-[6px] rounded-full shrink-0"
                    style={{ background: 'var(--accent)' }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </aside>

      {/* ── Context panel ──────────────────────────────────────── */}
      {selectedProject ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 shrink-0"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div>
              <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-1)' }}>
                {selectedProject.name}
              </h2>
              <div className="flex items-center gap-3 mt-[5px]">
                {meta && mode !== 'diff' && (
                  <>
                    {meta.pageCount > 0 && (
                      <MetaChip icon={<PageIcon />}>
                        {meta.pageCount} pages referenced
                      </MetaChip>
                    )}
                    {meta.syncedAt && (
                      <MetaChip icon={<ClockIcon />}>
                        Last synced {formatDate(meta.syncedAt)}
                      </MetaChip>
                    )}
                  </>
                )}
                {mode === 'diff' && (
                  <span className="text-[12px]" style={{ color: 'var(--text-3)' }}>
                    Sync complete —{' '}
                    <span style={{ color: changedLines > 0 ? 'var(--accent)' : 'var(--teal)' }}>
                      {changedLines} line{changedLines !== 1 ? 's' : ''} changed
                    </span>
                    . Review and apply.
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {saved && (
                <span className="text-[12px]" style={{ color: 'var(--teal)' }}>
                  Saved
                </span>
              )}

              {mode === 'diff' ? (
                <>
                  <button
                    type="button"
                    onClick={handleCancelSync}
                    disabled={saving}
                    className="px-4 py-[7px] rounded-[8px] text-[13px] font-medium transition-colors"
                    style={{
                      border: '1px solid var(--border)',
                      color: 'var(--text-2)',
                      opacity: saving ? 0.4 : 1,
                      cursor: saving ? 'not-allowed' : 'pointer',
                    }}
                    onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = 'var(--surface-2)' }}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleApply()}
                    disabled={saving}
                    className="flex items-center gap-[6px] px-4 py-[7px] rounded-[8px] text-[13px] font-medium text-white"
                    style={{
                      background: 'var(--accent)',
                      opacity: saving ? 0.7 : 1,
                      cursor: saving ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {saving ? (
                      <>
                        <SyncSpinner />
                        Applying…
                      </>
                    ) : (
                      'Apply'
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void handleSync()}
                    disabled={mode === 'syncing' || mode === 'loading'}
                    className="flex items-center gap-[6px] px-4 py-[7px] rounded-[8px] text-[13px] font-medium transition-colors"
                    style={{
                      border: '1px solid var(--border)',
                      color: 'var(--text-2)',
                      opacity: mode === 'syncing' || mode === 'loading' ? 0.55 : 1,
                      cursor: mode === 'syncing' || mode === 'loading' ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {mode === 'syncing' ? (
                      <>
                        <SyncSpinner />
                        Syncing…
                      </>
                    ) : (
                      <>
                        <SyncIcon />
                        Sync from Confluence
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={mode === 'loading' || saving}
                    className="px-4 py-[7px] rounded-[8px] text-[13px] font-medium text-white"
                    style={{
                      background: 'var(--accent)',
                      opacity: mode === 'loading' || saving ? 0.5 : 1,
                      cursor: mode === 'loading' || saving ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
            {error && (
              <div
                className="px-4 py-3 rounded-[8px] text-[13px] shrink-0"
                style={{ background: '#FAECE7', color: '#993C1D' }}
              >
                {error}
              </div>
            )}

            {/* Korean interpretation — edit mode only */}
            {mode === 'edit' && contextKo && (
              <div
                className="rounded-[10px] overflow-hidden shrink-0"
                style={{ border: '1px solid var(--border)' }}
              >
                <button
                  type="button"
                  onClick={() => setKoreanOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-[10px] text-left"
                  style={{ background: 'var(--surface-2)' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold" style={{ color: 'var(--text-2)' }}>
                      한국어 해석
                    </span>
                    <span
                      className="text-[10px] font-medium px-[6px] py-[1px] rounded-full"
                      style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
                    >
                      AI 번역
                    </span>
                  </div>
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    width="12"
                    height="12"
                    style={{
                      color: 'var(--text-3)',
                      transform: koreanOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                      transition: 'transform 0.18s',
                    }}
                  >
                    <polyline points="4,6 8,10 12,6" />
                  </svg>
                </button>
                {koreanOpen && (
                  <div
                    className="px-5 py-4 text-[13px] leading-[1.8] whitespace-pre-wrap"
                    style={{
                      color: 'var(--text-2)',
                      borderTop: '1px solid var(--border)',
                      background: 'var(--surface)',
                      maxHeight: 340,
                      overflowY: 'auto',
                    }}
                  >
                    {contextKo}
                  </div>
                )}
              </div>
            )}

            {/* Diff view */}
            {mode === 'diff' && diffLines.length > 0 && (
              <DiffView diffLines={diffLines} changedPageTitles={changedPageTitles} />
            )}

            {/* Editor */}
            <div className="flex flex-col gap-[6px] flex-1" style={{ minHeight: 0 }}>
              {mode === 'diff' && (
                <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>
                  Edit before applying — the content below will be saved as-is.
                </p>
              )}
              {mode === 'loading' ? (
                <div className="flex items-center justify-center flex-1" style={{ minHeight: 200 }}>
                  <SyncSpinner />
                </div>
              ) : (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full rounded-[10px] px-4 py-3 text-[13px] resize-none outline-none"
                  style={{
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text-1)',
                    fontFamily: 'var(--font-mono)',
                    lineHeight: '1.7',
                    flex: 1,
                    minHeight: mode === 'diff' ? 200 : 420,
                    transition: 'border-color 0.15s',
                  }}
                  placeholder="No context yet. Click 'Sync from Confluence' or type manually."
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center flex-col gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'var(--surface-2)' }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              width="22"
              height="22"
              style={{ color: 'var(--text-3)' }}
            >
              <path d="M9 12h6M9 16h4M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
            </svg>
          </div>
          <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>
            Select a project to view or edit its context
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function DiffView({ diffLines, changedPageTitles }: { diffLines: DiffLine[]; changedPageTitles: string[] }) {
  const sections = groupDiffBySections(diffLines)
  const addedCount = diffLines.filter((l) => l.type === 'added').length
  const removedCount = diffLines.filter((l) => l.type === 'removed').length

  return (
    <div className="rounded-[10px] overflow-hidden shrink-0" style={{ border: '1px solid var(--border)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-[9px]"
        style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold" style={{ color: 'var(--text-3)' }}>
            DIFF — Confluence vs current
          </span>
          {changedPageTitles.length > 0 && (
            <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
              ·{' '}
              {changedPageTitles.length === 1
                ? changedPageTitles[0]
                : `${changedPageTitles.length} pages updated`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span style={{ color: '#166534' }}>+{addedCount} added</span>
          <span style={{ color: '#991B1B' }}>−{removedCount} removed</span>
        </div>
      </div>

      {/* Body */}
      <div className="overflow-y-auto" style={{ maxHeight: 320, fontSize: '12px' }}>
        {sections ? (
          sections.map((section, sIdx) => (
            <SectionDiff key={sIdx} section={section} />
          ))
        ) : (
          // Fallback: no ## headers (legacy or manually edited context)
          diffLines.map((line, idx) => {
            if (line.type === 'unchanged') return null
            return <DiffRow key={idx} line={line} />
          })
        )}
      </div>
    </div>
  )
}

function SectionDiff({ section }: { section: DiffSection }) {
  const [expanded, setExpanded] = useState(section.hasChanges)

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      {/* Section header row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-[7px] text-left"
        style={{ background: section.hasChanges ? 'var(--surface)' : 'var(--surface-2)' }}
      >
        <svg
          viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
          width="10" height="10"
          style={{
            color: 'var(--text-3)',
            transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.15s',
            flexShrink: 0,
          }}
        >
          <polyline points="4,6 8,10 12,6" />
        </svg>
        <span
          className="text-[11px] font-semibold flex-1"
          style={{ color: section.hasChanges ? 'var(--text-1)' : 'var(--text-3)' }}
        >
          {section.title || '(no title)'}
        </span>
        {section.hasChanges ? (
          <span
            className="text-[10px] font-medium px-[6px] py-[1px] rounded-full"
            style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
          >
            updated
          </span>
        ) : (
          <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
            unchanged
          </span>
        )}
      </button>

      {/* Section diff lines */}
      {expanded && (
        <div>
          {section.lines.map((line, idx) => {
            if (line.content.startsWith('## ')) return null
            if (line.type === 'unchanged') return null
            return <DiffRow key={idx} line={line} />
          })}
          {section.hasChanges &&
            section.lines.every((l) => l.content.startsWith('## ') || l.type === 'unchanged') && (
              <div className="px-4 py-[5px] text-[11px]" style={{ color: 'var(--text-3)' }}>
                (section added or removed)
              </div>
            )}
        </div>
      )}
    </div>
  )
}

function DiffRow({ line }: { line: DiffLine }) {
  return (
    <div
      className="flex items-start gap-2 px-4 py-[5px]"
      style={{
        background: line.type === 'added' ? '#F0FDF4' : '#FFF1F2',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span
        className="shrink-0 mt-[2px] text-[10px] font-bold px-[5px] py-[1px] rounded"
        style={{
          background: line.type === 'added' ? '#DCFCE7' : '#FFE4E6',
          color: line.type === 'added' ? '#166534' : '#991B1B',
        }}
      >
        {line.type === 'added' ? 'NEW' : 'OLD'}
      </span>
      <span
        style={{
          color: line.type === 'added' ? '#166534' : '#991B1B',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {line.content || ' '}
      </span>
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function MetaChip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-[5px] text-[11px]" style={{ color: 'var(--text-3)' }}>
      {icon}
      {children}
    </span>
  )
}

function PageIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="11" height="11">
      <path d="M4 2h6l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
      <polyline points="9,2 9,5 12,5" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="11" height="11">
      <circle cx="8" cy="8" r="6" />
      <polyline points="8,5 8,8 10,10" />
    </svg>
  )
}

function SyncIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13">
      <path d="M13.5 2.5A6.5 6.5 0 0 0 2 8" />
      <path d="M2.5 13.5A6.5 6.5 0 0 0 14 8" />
      <polyline points="11,2 13.5,2.5 13,5" />
      <polyline points="5,14 2.5,13.5 3,11" />
    </svg>
  )
}

function SyncSpinner() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      width="13"
      height="13"
      className="animate-spin"
    >
      <circle cx="8" cy="8" r="6" strokeOpacity="0.25" />
      <path d="M14 8a6 6 0 0 0-6-6" />
    </svg>
  )
}
