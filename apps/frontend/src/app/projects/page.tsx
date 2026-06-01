'use client'

import { useEffect } from 'react'
import { useProjects } from '@/hooks/use-projects'
import { useUIStore } from '@/stores/ui-store'
import { StatCard } from '@/components/projects/stat-card'
import { NewProjectModal } from '@/components/projects/new-project-modal'
import { MOCK_QUEUE } from '@/mocks/queue'
import { MOCK_NOTIFICATIONS } from '@/mocks/notifications'
import type { QueueItem } from '@/types/queue'
import type { Notification } from '@/types/notification'

const QUEUE_STATUS_CONFIG: Record<QueueItem['status'], { label: string; bg: string; color: string }> = {
  running: { label: 'Running', bg: '#FAEEDA', color: '#854F0B' },
  queued:  { label: 'Queued',  bg: 'var(--surface-2)', color: 'var(--text-2)' },
  done:    { label: 'Done',    bg: '#EFF6FF', color: '#1E40AF' },
  error:   { label: 'Error',   bg: '#FAECE7', color: '#993C1D' },
}

const NOTIFICATION_DOT: Record<Notification['type'], string> = {
  'pr-review':  '#1F3F8E',
  'mention':    '#854F0B',
  'deadline':   '#993C1D',
  'task-done':  '#1E40AF',
  'alert':      '#6B4FBB',
}

export default function ProjectsPage() {
  const { notStartedCount, planningCount, activeCount, doneCount } = useProjects()
  const { setTopbarTitle, openNewProjectModal, closeNewProjectModal, isNewProjectModalOpen } = useUIStore()

  useEffect(() => {
    setTopbarTitle('Projects')
  }, [setTopbarTitle])

  const pendingCount = MOCK_QUEUE.filter((q) => q.status === 'running' || q.status === 'queued').length
  const notifications = MOCK_NOTIFICATIONS.slice(0, 5)

  return (
    <div className="px-7 py-6">
      {/* Header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.4px]">Projects</h2>
        </div>
        <button
          type="button"
          onClick={openNewProjectModal}
          className="flex items-center gap-[5px] px-3 py-[7px] rounded-[8px] text-[13px] font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--accent)' }}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" width="13" height="13">
            <line x1="8" y1="3" x2="8" y2="13" />
            <line x1="3" y1="8" x2="13" y2="8" />
          </svg>
          New Project
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-[10px] mb-5" style={{ maxWidth: 640 }}>
        <StatCard label="Not Started" value={notStartedCount} />
        <StatCard label="Planning" value={planningCount} />
        <StatCard label="Active" value={activeCount} highlight />
        <StatCard label="Done" value={doneCount} />
      </div>

      {/* Task Queue + Notifications */}
      <div className="flex gap-4 items-start">

        {/* Task Queue */}
        <div
          className="rounded-[12px] overflow-hidden"
          style={{ flex: '1 1 0', minWidth: 0, background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div
            className="flex items-center justify-between px-[14px] py-[8px]"
            style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em]" style={{ color: 'var(--text-3)' }}>
              Task Queue
            </span>
            {pendingCount > 0 && (
              <span
                className="text-[11px] font-semibold px-[7px] py-[2px] rounded-[7px]"
                style={{ background: '#FAEEDA', color: '#854F0B' }}
              >
                {pendingCount} pending
              </span>
            )}
          </div>

          {MOCK_QUEUE.length === 0 ? (
            <div className="px-[14px] py-5">
              <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>No pending tasks.</p>
            </div>
          ) : (
            MOCK_QUEUE.map((item, idx) => {
              const cfg = QUEUE_STATUS_CONFIG[item.status]
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-[14px] py-[10px]"
                  style={idx < MOCK_QUEUE.length - 1 ? { borderBottom: '1px solid var(--border)' } : undefined}
                >
                  <div
                    className="w-[6px] h-[6px] rounded-full shrink-0"
                    style={{ background: item.status === 'running' ? '#854F0B' : 'var(--text-3)' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-[6px]">
                      <span className="text-[12px] font-medium" style={{ color: 'var(--text-1)' }}>
                        {item.toolLabel}
                      </span>
                      <span className="text-[11px] truncate" style={{ color: 'var(--text-3)' }}>
                        {item.subject}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-[8px] shrink-0">
                    <span
                      className="text-[11px] font-semibold px-[7px] py-[2px] rounded-[7px]"
                      style={{ background: cfg.bg, color: cfg.color }}
                    >
                      {cfg.label}
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                      {item.requestedAt.slice(11)}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Notifications */}
        <div
          className="rounded-[12px] overflow-hidden"
          style={{ flex: '1 1 0', minWidth: 0, background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div
            className="flex items-center justify-between px-[14px] py-[8px]"
            style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em]" style={{ color: 'var(--text-3)' }}>
              Notifications
            </span>
            {notifications.length > 0 && (
              <span
                className="text-[11px] font-semibold px-[7px] py-[2px] rounded-[7px]"
                style={{ background: '#FAECE7', color: '#993C1D' }}
              >
                {notifications.length} unread
              </span>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="px-[14px] py-5">
              <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>No unread notifications.</p>
            </div>
          ) : (
            notifications.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-start gap-[10px] px-[14px] py-[10px]"
                style={idx < notifications.length - 1 ? { borderBottom: '1px solid var(--border)' } : undefined}
              >
                <div
                  className="w-[6px] h-[6px] rounded-full shrink-0 mt-[4px]"
                  style={{ background: NOTIFICATION_DOT[item.type] }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium" style={{ color: 'var(--text-1)' }}>
                    {item.title}
                  </div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--text-3)' }}>
                    {item.source}
                  </div>
                </div>
                <span className="text-[11px] shrink-0" style={{ color: 'var(--text-3)' }}>
                  {item.time}
                </span>
              </div>
            ))
          )}
        </div>

      </div>

      {isNewProjectModalOpen && (
        <NewProjectModal onClose={closeNewProjectModal} />
      )}
    </div>
  )
}
