'use client'

import { useEffect, useState, useMemo } from 'react'
import { useUIStore } from '@/stores/ui-store'
import { VersionAssignmentTable } from '@/components/releases/version-assignment-table'
import { VersionAssignModal } from '@/components/releases/version-assign-modal'
import { MOCK_JIRA_VERSIONS, MOCK_UNVERSIONED_TICKETS } from '@/mocks/version-assignment'
import type { JiraTicket, JiraVersion, EpicGroup, FilterPeriod } from '@/types/version-assignment'

const FILTER_OPTIONS: { value: FilterPeriod; label: string }[] = [
  { value: '15d', label: '15 days' },
  { value: '1m',  label: '1 month' },
  { value: '2m',  label: '2 months' },
  { value: '3m',  label: '3 months' },
]

export default function VersionAssignmentPage() {
  const setTopbarTitle = useUIStore((s) => s.setTopbarTitle)

  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('1m')
  const [searchQuery, setSearchQuery] = useState('')
  const [tickets, setTickets] = useState<JiraTicket[]>(MOCK_UNVERSIONED_TICKETS)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedVersion, setSelectedVersion] = useState<JiraVersion | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    setTopbarTitle('Version Assignment')
  }, [setTopbarTitle])

  const sortedVersions = useMemo(
    () => [...MOCK_JIRA_VERSIONS].sort((a, b) => a.releaseDate.localeCompare(b.releaseDate)),
    [],
  )

  const groups = useMemo<EpicGroup[]>(() => {
    const filtered = tickets.filter((t) => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return t.id.toLowerCase().includes(q) || t.summary.toLowerCase().includes(q)
    })

    const map = new Map<string | null, JiraTicket[]>()
    for (const ticket of filtered) {
      if (!map.has(ticket.epicId)) map.set(ticket.epicId, [])
      map.get(ticket.epicId)!.push(ticket)
    }

    return [...map.entries()]
      .sort(([a], [b]) => {
        if (a === null) return 1
        if (b === null) return -1
        return a.localeCompare(b)
      })
      .map(([epicId, epicTickets]) => ({
        epicId,
        epicName: epicTickets[0]?.epicName ?? null,
        tickets: epicTickets,
      }))
  }, [tickets, searchQuery])

  const selectedTickets = useMemo(
    () => tickets.filter((t) => selectedIds.has(t.id)),
    [tickets, selectedIds],
  )

  const handleToggleTicket = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleToggleEpic = (epicId: string | null) => {
    const group = groups.find((g) => g.epicId === epicId)
    if (!group) return
    const allSelected = group.tickets.every((t) => selectedIds.has(t.id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) group.tickets.forEach((t) => next.delete(t.id))
      else group.tickets.forEach((t) => next.add(t.id))
      return next
    })
  }

  const handleConfirm = () => {
    setShowModal(false)
    const idsToAssign = new Set(selectedIds)
    const count = idsToAssign.size
    const versionName = selectedVersion!.name

    setTickets((prev) => prev.filter((t) => !idsToAssign.has(t.id)))
    setSelectedIds(new Set())
    setFailedIds(new Set())
    setSelectedVersion(null)

    setToast(`${count} ticket${count !== 1 ? 's' : ''} assigned to ${versionName}`)
    setTimeout(() => setToast(null), 3500)
  }

  const canApply = selectedIds.size > 0 && selectedVersion !== null

  return (
    <div className="px-7 py-6">
      {/* Page header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.4px]">Version Assignment</h2>
          <p className="text-[12px] mt-[3px]" style={{ color: 'var(--text-3)' }}>
            Filter unversioned Jira tickets and bulk-assign a release version.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {/* Period filter */}
        <div
          className="flex rounded-[8px] overflow-hidden shrink-0"
          style={{ border: '1px solid var(--border-md)', background: 'var(--surface)' }}
        >
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilterPeriod(opt.value)}
              className="px-[12px] py-[6px] text-[12px] font-medium transition-colors"
              style={
                filterPeriod === opt.value
                  ? { background: 'var(--accent)', color: '#fff' }
                  : { color: 'var(--text-2)' }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search by ticket ID or summary…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[200px] px-[10px] py-[6px] rounded-[8px] text-[12px] outline-none"
          style={{ background: 'var(--surface)', border: '1px solid var(--border-md)', color: 'var(--text-1)' }}
        />

        <div className="flex-1" />

        {/* Selected count */}
        <span
          className="text-[12px] font-medium shrink-0"
          style={{ color: selectedIds.size > 0 ? 'var(--text-1)' : 'var(--text-3)' }}
        >
          {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'None selected'}
        </span>

        {/* Version dropdown */}
        <select
          value={selectedVersion?.id ?? ''}
          onChange={(e) => {
            const v = sortedVersions.find((ver) => ver.id === e.target.value) ?? null
            setSelectedVersion(v)
          }}
          disabled={selectedIds.size === 0}
          className="px-[10px] py-[6px] rounded-[8px] text-[12px] outline-none cursor-pointer min-w-[210px] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: 'var(--surface)',
            border: selectedVersion ? '1px solid var(--accent)' : '1px solid var(--border-md)',
            color: selectedVersion ? 'var(--accent)' : 'var(--text-1)',
          }}
        >
          <option value="">— Select version —</option>
          {sortedVersions.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>

        {/* Apply button */}
        <button
          type="button"
          onClick={() => canApply && setShowModal(true)}
          disabled={!canApply}
          className="flex items-center gap-[5px] px-[14px] py-[7px] rounded-[8px] text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          style={{ background: 'var(--accent)' }}
        >
          Apply
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
            <path d="M4 8h8M9 5l3 3-3 3" />
          </svg>
        </button>
      </div>

      {/* Table */}
      <VersionAssignmentTable
        groups={groups}
        selectedIds={selectedIds}
        failedIds={failedIds}
        onToggleTicket={handleToggleTicket}
        onToggleEpic={handleToggleEpic}
      />

      {/* Preview modal */}
      {showModal && selectedVersion && (
        <VersionAssignModal
          tickets={selectedTickets}
          version={selectedVersion}
          onConfirm={handleConfirm}
          onCancel={() => setShowModal(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-[8px] px-4 py-3 rounded-[10px] text-[13px] font-medium shadow-lg"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M3 8l3.5 3.5L13 5" />
          </svg>
          {toast}
        </div>
      )}
    </div>
  )
}
