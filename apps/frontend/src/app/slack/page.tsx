'use client'

import { useEffect, useState, useCallback } from 'react'
import { SlackFilterBar } from '@/components/slack/slack-filter-bar'
import { SlackItem } from '@/components/slack/slack-item'
import { useUIStore } from '@/stores/ui-store'
import { useProjectStore } from '@/stores/project-store'
import { fetchSlackQaItems, linkSlackQaItem, pushToPrd, deleteSlackQaItem } from '@/api/slack'
import type { SlackFilter, SlackItem as SlackItemType } from '@/types/slack'

export default function SlackPage() {
  const setTopbarTitle = useUIStore((s) => s.setTopbarTitle)
  const projects = useProjectStore((s) => s.projects)

  const [filter, setFilter] = useState<SlackFilter>('all')
  const [items, setItems] = useState<SlackItemType[]>([])
  const [pushingId, setPushingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setTopbarTitle('Slack Q&A Linker')
  }, [setTopbarTitle])

  const loadItems = useCallback(async () => {
    try {
      const data = await fetchSlackQaItems()
      setItems(data)
    } catch {
      setError('Failed to load Slack Q&A items')
    }
  }, [])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const handleLink = async (itemId: number, projectId: number | null) => {
    try {
      const updated = await linkSlackQaItem(itemId, projectId)
      setItems((prev) => prev.map((item) => (item.id === itemId ? updated : item)))
    } catch {
      setError('Failed to link project')
    }
  }

  const handlePushToPrd = async (itemId: number) => {
    setPushingId(itemId)
    setError(null)
    try {
      const updated = await pushToPrd(itemId)
      setItems((prev) => prev.map((item) => (item.id === itemId ? updated : item)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to push to PRD')
    } finally {
      setPushingId(null)
    }
  }

  const handleDelete = async (itemId: number) => {
    try {
      await deleteSlackQaItem(itemId)
      setItems((prev) => prev.filter((item) => item.id !== itemId))
    } catch {
      setError('Failed to delete item')
    }
  }

  const handleCopyCommand = async () => {
    await navigator.clipboard.writeText('/project:slack-sync')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const filteredItems = items.filter((item) => {
    if (filter === 'archived') return item.archived
    return !item.archived
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Channel sub-header */}
      <div
        className="flex items-center gap-[10px] px-5 h-[46px] shrink-0"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div
          className="text-[13px] font-semibold flex items-center gap-1"
          style={{ color: '#4A154B' }}
        >
          <span className="text-[16px] font-bold opacity-70">#</span>
          private-onco-squad · DMs
        </div>
        <div className="flex items-center gap-[6px] flex-1 text-[11px]" style={{ color: 'var(--text-3)' }}>
          <span>Enter in Claude Code:</span>
          <div
            className="flex items-center gap-[6px] rounded-[4px] px-[8px] py-[2px] font-mono"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)' }}
          >
            <span style={{ color: 'var(--text-2)' }}>/project:slack-sync</span>
            <button
              type="button"
              onClick={handleCopyCommand}
              title="Copy command"
              className="transition-colors"
              style={{ color: copied ? '#16a34a' : 'var(--text-3)' }}
            >
              {copied ? (
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
                  <path d="M2 8l4 4 8-8" />
                </svg>
              ) : (
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="11" height="11">
                  <rect x="5" y="5" width="8" height="8" rx="1" />
                  <path d="M5 5V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-1" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="px-5 py-2 text-[12px]"
          style={{ background: '#FEF2F2', color: '#DC2626', borderBottom: '1px solid #FCA5A5' }}
        >
          {error}
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

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
            style={{
              background: 'var(--surface)',
              border: '1px dashed var(--border-md)',
            }}
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
            <p
              className="text-[13px] font-medium mb-1"
              style={{ color: 'var(--text-3)' }}
            >
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
            {items.length === 0
              ? 'No items yet — run /project:slack-sync in Claude Code to import'
              : 'No messages'}
          </div>
        )}

        {filteredItems.map((item) => (
          <SlackItem
            key={item.id}
            item={item}
            projects={projects}
            onLink={handleLink}
            onPushToPrd={handlePushToPrd}
            onDelete={handleDelete}
            isArchived={filter === 'archived'}
            isPushing={pushingId === item.id}
          />
        ))}
      </div>
    </div>
  )
}
