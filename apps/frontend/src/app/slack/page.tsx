'use client'

import { useEffect, useState } from 'react'
import { SlackFilterBar } from '@/components/slack/slack-filter-bar'
import { SlackItem } from '@/components/slack/slack-item'
import { useUIStore } from '@/stores/ui-store'
import { useProjectStore } from '@/stores/project-store'
import { MOCK_SLACK_ITEMS } from '@/mocks/slack'
import type { SlackFilter, SlackItem as SlackItemType } from '@/types/slack'

export default function SlackPage() {
  const setTopbarTitle = useUIStore((s) => s.setTopbarTitle)
  const projects = useProjectStore((s) => s.projects)

  const [filter, setFilter] = useState<SlackFilter>('all')
  const [items, setItems] = useState<SlackItemType[]>(MOCK_SLACK_ITEMS)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    setTopbarTitle('Slack Q&A Linker')
  }, [setTopbarTitle])

  const handleLink = (itemId: string, projectId: string | null) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, linkedProjectId: projectId } : item,
      ),
    )
  }

  const handleArchive = (itemId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, archived: true } : item,
      ),
    )
  }

  const handleSync = () => {
    setIsSyncing(true)
    setTimeout(() => setIsSyncing(false), 1200)
  }

  const filteredItems = items.filter((item) => {
    if (filter === 'archived') return item.archived
    if (item.archived) return false
    if (filter === 'linked') return item.linkedProjectId !== null
    if (filter === 'unlinked') return item.linkedProjectId === null
    return true
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Channel sub-header */}
      <div
        className="flex items-center gap-[10px] px-5 h-[46px] shrink-0"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="text-[13px] font-semibold flex items-center gap-1" style={{ color: '#4A154B' }}>
          <span className="text-[16px] font-bold opacity-70">#</span>
          private-onco-squad
        </div>
        <div className="text-[11px] flex-1" style={{ color: 'var(--text-3)' }}>
          Channel messages & DMs tagged with :strong-pm: · auto-collected
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={isSyncing}
          data-testid="sync-btn"
          className="flex items-center gap-[5px] text-[11px] rounded-[6px] px-[10px] py-1 border transition-colors disabled:opacity-50"
          style={{
            background: 'var(--surface-2)',
            borderColor: 'var(--border-md)',
            color: 'var(--text-3)',
          }}
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            width="12"
            height="12"
            className={isSyncing ? 'animate-spin' : ''}
          >
            <path d="M1 8a7 7 0 1 0 1.5-4.3" />
            <polyline points="1,2 1,6 5,6" />
          </svg>
          Sync
        </button>
      </div>

      {/* Filter bar */}
      <SlackFilterBar
        activeFilter={filter}
        count={filteredItems.length}
        onFilter={setFilter}
      />

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {filter === 'archived' && filteredItems.length === 0 && (
          <div
            className="rounded-[12px] p-[40px_20px] text-center"
            style={{ background: 'var(--surface)', border: '1px dashed var(--border-md)' }}
            data-testid="empty-state"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              width="28"
              height="28"
              className="mx-auto mb-[10px] opacity-40"
              style={{ color: 'var(--text-3)' }}
            >
              <rect x="1" y="4" width="14" height="10" rx="1" />
              <path d="M1 4h14M6 8h4" />
            </svg>
            <p className="text-[13px] font-medium mb-1" style={{ color: 'var(--text-3)' }}>
              No archived items yet
            </p>
            <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>
              After linking a project, click "→ PRD Q&A" to archive items here.
            </p>
          </div>
        )}

        {filter !== 'archived' && filteredItems.length === 0 && (
          <div
            className="text-center py-10 text-[13px]"
            style={{ color: 'var(--text-3)' }}
            data-testid="empty-state"
          >
            No messages
          </div>
        )}

        {filteredItems.map((item) => (
          <SlackItem
            key={item.id}
            item={item}
            projects={projects}
            linkedProjectId={item.linkedProjectId}
            onLink={handleLink}
            onArchive={handleArchive}
            isArchived={filter === 'archived'}
          />
        ))}
      </div>
    </div>
  )
}
