'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useProjectStore } from '@/stores/project-store'
import { useUIStore } from '@/stores/ui-store'
import { Badge } from '@/components/ui/badge'
import { WorkflowStepper } from '@/components/projects/workflow-stepper'
import { MOCK_PRS } from '@/mocks/prs'
import { MOCK_PRD_HISTORY } from '@/mocks/prd'
import { syncProjectContext, fetchProjectContext } from '@/api/projects'
import type { ProjectContext } from '@/api/projects'

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { setTopbarTitle } = useUIStore()

  const projects = useProjectStore((s) => s.projects)
  const advanceWorkflowStep = useProjectStore((s) => s.advanceWorkflowStep)
  const updateProjectStatus = useProjectStore((s) => s.updateProjectStatus)

  const project = projects.find((p) => p.id === id)

  const [showDoneModal, setShowDoneModal] = useState(false)
  const [context, setContext] = useState<ProjectContext | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    setTopbarTitle(project?.name ?? 'Project')
  }, [setTopbarTitle, project?.name])

  useEffect(() => {
    if (id) {
      void fetchProjectContext(id).then(setContext).catch(() => null)
    }
  }, [id])

  if (!project) {
    return (
      <div className="px-7 py-6">
        <p style={{ color: 'var(--text-3)' }}>Project not found.</p>
      </div>
    )
  }

  const currentStep = project.workflowStep ?? 1
  const isDone = project.status === 'done'
  const linkedPrs = MOCK_PRS.filter((pr) => pr.linkedProjectId === id)
  const prdRecords = MOCK_PRD_HISTORY.filter((r) => r.projectId === id)

  const [selectedStep, setSelectedStep] = useState(isDone ? 5 : currentStep)

  useEffect(() => {
    setSelectedStep(isDone ? 5 : currentStep)
  }, [currentStep, isDone])

  const handleAdvance = () => { void advanceWorkflowStep(id) }
  const handleMarkDone = () => setShowDoneModal(true)
  const handleConfirmDone = () => {
    void updateProjectStatus(id, 'done')
    setShowDoneModal(false)
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await syncProjectContext(id)
      // Poll for updated context after a short delay
      setTimeout(async () => {
        const updated = await fetchProjectContext(id).catch(() => null)
        if (updated) setContext(updated)
        setIsSyncing(false)
      }, 3000)
    } catch {
      setIsSyncing(false)
    }
  }

  return (
    <div className="px-7 py-6 max-w-[900px]">
      {/* Header */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.push('/projects')}
          className="flex items-center gap-[4px] text-[11px] font-medium mb-[10px] transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-3)' }}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="10" height="10">
            <path d="M10 3L5 8l5 5" />
          </svg>
          Projects
        </button>

        <div className="flex items-center gap-[10px]">
          <h1 className="text-[22px] font-semibold tracking-[-0.5px] leading-none">{project.name}</h1>
          <Badge status={project.status} />
        </div>

        {/* Metadata row */}
        <div className="flex items-center gap-[6px] mt-[10px] flex-wrap">
          {project.relatedProducts.map((p) => (
            <span
              key={p}
              className="text-[11px] font-medium px-[7px] py-[2px] rounded-[5px]"
              style={{ background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border-md)' }}
            >
              {p}
            </span>
          ))}
          <div className="w-px h-[12px] mx-[2px]" style={{ background: 'var(--border-md)' }} />
          {project.epicLink && (
            <a
              href={project.epicLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-[4px] text-[11px] font-medium px-[8px] py-[3px] rounded-[5px] transition-opacity hover:opacity-80"
              style={{ color: 'var(--accent)', background: 'var(--accent-light)', border: '1px solid var(--accent-mid)' }}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="10" height="10">
                <path d="M10 2h4v4M14 2L8 8M6 4H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3" />
              </svg>
              Epic
            </a>
          )}
          {project.confluenceLink && (
            <a
              href={project.confluenceLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-[4px] text-[11px] font-medium px-[8px] py-[3px] rounded-[5px] transition-opacity hover:opacity-80"
              style={{ color: 'var(--text-2)', background: 'var(--surface-2)', border: '1px solid var(--border-md)' }}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="10" height="10">
                <path d="M10 2h4v4M14 2L8 8M6 4H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3" />
              </svg>
              Confluence
            </a>
          )}

          {/* Context status + Sync button */}
          <div className="flex items-center gap-[6px] ml-[4px]">
            {context?.syncedAt ? (
              <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                Context synced {context.syncedAt} · {context.pageCount} page{context.pageCount !== 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                {isSyncing ? 'Syncing context…' : 'No context yet'}
              </span>
            )}
            {project.confluenceLink && (
              <button
                type="button"
                onClick={() => { void handleSync() }}
                disabled={isSyncing}
                className="flex items-center gap-[4px] text-[11px] font-medium px-[8px] py-[3px] rounded-[5px] transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)', color: 'var(--text-2)' }}
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  width="10"
                  height="10"
                  className={isSyncing ? 'animate-spin' : ''}
                >
                  <path d="M13 8A5 5 0 1 1 8 3M13 3v5h-5" />
                </svg>
                Sync
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Workflow stepper */}
      <div className="mb-5">
        <WorkflowStepper
          currentStep={currentStep}
          isDone={isDone}
          selectedStep={selectedStep}
          onStepClick={setSelectedStep}
          onAdvance={handleAdvance}
          onMarkDone={handleMarkDone}
        />
      </div>

      <StepContent step={selectedStep} isDone={isDone} project={project} linkedPrs={linkedPrs} prdRecords={prdRecords} />

      {showDoneModal && (
        <DoneModal
          openPrs={linkedPrs}
          onConfirm={handleConfirmDone}
          onCancel={() => setShowDoneModal(false)}
        />
      )}
    </div>
  )
}

/* ---------- Step content ---------- */

import type { Project } from '@/types/project'
import type { PullRequest } from '@/types/pr'
import type { PrdRunRecord } from '@/types/prd'

interface StepContentProps {
  step: number
  isDone: boolean
  project: Project
  linkedPrs: PullRequest[]
  prdRecords: PrdRunRecord[]
}

function StepContent({ step, isDone, project, linkedPrs, prdRecords }: StepContentProps) {
  if (step === 1) return <KickoffPanel project={project} />
  if (step === 2) return <PrdPanel prdRecords={prdRecords} confluenceLink={project.confluenceLink} />
  if (step === 3) return <PlaceholderPanel title="Feature List" message="Feature planning is not yet available in this version." />
  if (step === 4) return <DevelopmentPanel linkedPrs={linkedPrs} />
  if (step === 5) {
    if (isDone) {
      return (
        <div className="flex flex-col gap-3">
          <div className="rounded-[12px] p-5" style={{ background: 'var(--surface)', border: '1px solid var(--teal)' }}>
            <p className="text-[13px] font-semibold mb-1" style={{ color: 'var(--teal)' }}>Project Complete</p>
            <p className="text-[12px]" style={{ color: 'var(--text-2)' }}>{project.description}</p>
          </div>
          <PlaceholderPanel title="Deployment" message="Deployment tracking is not yet available in this version." />
        </div>
      )
    }
    return <PlaceholderPanel title="Deployment" message="Deployment tracking is not yet available in this version." />
  }
  return null
}

function KickoffPanel({ project }: { project: Project }) {
  return (
    <div className="flex flex-col gap-3">
      {project.background && <InfoCard label="Background" content={project.background} />}
      {project.hlr && <InfoCard label="High Level Requirement" content={project.hlr} />}
      {!project.background && !project.hlr && (
        <div className="rounded-[12px] p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>No background or requirements added. Edit the project to add context.</p>
        </div>
      )}
      <div className="rounded-[10px] px-[14px] py-[10px] flex items-center gap-[8px]" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12" className="shrink-0" style={{ color: 'var(--text-3)' }}>
          <circle cx="8" cy="8" r="6" /><line x1="8" y1="5" x2="8" y2="8" /><circle cx="8" cy="11" r=".5" fill="currentColor" />
        </svg>
        <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>Run the Kick off agent from your Confluence page, then mark this step complete.</p>
      </div>
    </div>
  )
}

function PrdPanel({ prdRecords, confluenceLink }: { prdRecords: PrdRunRecord[]; confluenceLink: string }) {
  return (
    <div className="flex flex-col gap-3">
      {prdRecords.length === 0 ? (
        <div className="rounded-[12px] p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>
            No PRD runs yet for this project. Go to{' '}
            <a href="/prd-writer" className="underline" style={{ color: 'var(--accent)' }}>PRD Writer</a> to generate one.
          </p>
        </div>
      ) : (
        prdRecords.map((rec) => (
          <div key={rec.id} className="rounded-[12px] p-[14px_16px]" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-[6px]">
              <span className="text-[11px] font-semibold" style={{ color: 'var(--text-1)' }}>PRD Run</span>
              <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>{rec.requestedAt}</span>
            </div>
            <div className="flex items-center gap-[8px]">
              <span className="text-[11px] font-medium px-[7px] py-[2px] rounded-[6px]" style={rec.status === 'done' ? { background: '#EFF6FF', color: '#1E40AF' } : { background: '#FAEEDA', color: '#854F0B' }}>
                {rec.status === 'done' ? 'Done' : 'Running'}
              </span>
              {rec.confluenceUrl && (
                <a href={rec.confluenceUrl} target="_blank" rel="noreferrer" className="text-[11px] font-medium transition-opacity hover:opacity-70" style={{ color: 'var(--accent)' }}>
                  View PRD ↗
                </a>
              )}
            </div>
          </div>
        ))
      )}
      <div className="rounded-[10px] px-[14px] py-[10px] flex items-center gap-[8px]" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12" style={{ color: 'var(--text-3)' }}>
          <circle cx="8" cy="8" r="6" /><line x1="8" y1="5" x2="8" y2="8" /><circle cx="8" cy="11" r=".5" fill="currentColor" />
        </svg>
        <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>Once the PRD is generated and reviewed, mark this step complete.</p>
      </div>
    </div>
  )
}

function DevelopmentPanel({ linkedPrs }: { linkedPrs: PullRequest[] }) {
  return (
    <div className="flex flex-col gap-3">
      {linkedPrs.length === 0 ? (
        <div className="rounded-[12px] p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>
            No PRs linked to this project yet. Link PRs from the{' '}
            <a href="/pr-tracker" className="underline" style={{ color: 'var(--accent)' }}>PR Tracker</a>.
          </p>
        </div>
      ) : (
        linkedPrs.map((pr) => (
          <div key={pr.id} className="rounded-[12px] p-[14px_16px]" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-[4px]">
              <span className="text-[12px] font-semibold" style={{ color: 'var(--text-1)' }}>{pr.title}</span>
              <span className="text-[11px] font-medium px-[7px] py-[2px] rounded-[6px] shrink-0 ml-2" style={{ background: '#EFF6FF', color: '#1E40AF' }}>Open</span>
            </div>
            <p className="text-[11px] mb-[6px]" style={{ color: 'var(--text-3)' }}>{pr.description}</p>
            <div className="flex items-center gap-[8px]">
              <span className="text-[11px] font-medium px-[6px] py-[2px] rounded-[5px]" style={{ background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border-md)' }}>{pr.repo}</span>
              <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>{pr.date}</span>
              <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>@{pr.author.login}</span>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function PlaceholderPanel({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-[12px] p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p className="text-[13px] font-semibold mb-[4px]">{title}</p>
      <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>{message}</p>
    </div>
  )
}

function InfoCard({ label, content }: { label: string; content: string }) {
  return (
    <div className="rounded-[12px] p-[14px_16px]" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.05em] mb-[6px]" style={{ color: 'var(--text-3)' }}>{label}</div>
      <p className="text-[12px] leading-[1.6]" style={{ color: 'var(--text-1)' }}>{content}</p>
    </div>
  )
}

function DoneModal({ openPrs, onConfirm, onCancel }: { openPrs: PullRequest[]; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="w-full max-w-[440px] rounded-[16px] p-6 mx-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h3 className="text-[15px] font-semibold mb-1">Mark project as Done?</h3>
        {openPrs.length > 0 ? (
          <>
            <p className="text-[12px] mb-4" style={{ color: 'var(--text-2)' }}>
              There {openPrs.length === 1 ? 'is' : 'are'} {openPrs.length} open PR{openPrs.length > 1 ? 's' : ''} linked to this project:
            </p>
            <div className="flex flex-col gap-2 mb-5">
              {openPrs.map((pr) => (
                <div key={pr.id} className="flex items-start gap-2 rounded-[8px] px-[12px] py-[8px]" style={{ background: '#FAECE7', border: '1px solid #F0C4B4' }}>
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12" className="mt-[2px] shrink-0" style={{ color: '#993C1D' }}>
                    <circle cx="8" cy="8" r="6" /><line x1="8" y1="5" x2="8" y2="8" /><circle cx="8" cy="11" r=".5" fill="currentColor" />
                  </svg>
                  <div>
                    <p className="text-[11px] font-medium" style={{ color: '#993C1D' }}>{pr.title}</p>
                    <p className="text-[11px]" style={{ color: '#993C1D', opacity: 0.8 }}>{pr.repo}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-[12px] mb-5" style={{ color: 'var(--text-2)' }}>No open PRs linked to this project. Safe to close.</p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-[8px] rounded-[8px] text-[12px] font-medium transition-colors" style={{ background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border-md)' }}>Cancel</button>
          <button type="button" onClick={onConfirm} className="px-4 py-[8px] rounded-[8px] text-[12px] font-semibold text-white transition-opacity hover:opacity-90" style={{ background: openPrs.length > 0 ? '#993C1D' : 'var(--teal)' }}>
            {openPrs.length > 0 ? 'Close Anyway' : 'Mark as Done'}
          </button>
        </div>
      </div>
    </div>
  )
}
