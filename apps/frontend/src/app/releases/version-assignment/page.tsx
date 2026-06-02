'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useUIStore } from '@/stores/ui-store'
import { VersionAssignmentTable } from '@/components/releases/version-assignment-table'
import { VersionAssignModal } from '@/components/releases/version-assign-modal'
import {
  fetchVersionOptions,
  fetchUnversionedTickets,
  assignVersion,
} from '@/api/version-assignment'
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
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set())
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [tickets, setTickets] = useState<JiraTicket[]>([])
  const [versions, setVersions] = useState<JiraVersion[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedVersion, setSelectedVersion] = useState<JiraVersion | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const statusDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTopbarTitle('Version Assignment')
    void fetchVersionOptions().then(setVersions).catch(() => setVersions([]))
  }, [setTopbarTitle])

  const loadTickets = useCallback((period: FilterPeriod) => {
    setIsLoading(true)
    setSelectedIds(new Set())
    setSelectedStatuses(new Set())
    void fetchUnversionedTickets(period)
      .then(setTickets)
      .catch(() => setTickets([]))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    loadTickets(filterPeriod)
  }, [filterPeriod, loadTickets])

  // Close status dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Derive unique statuses from all fetched tickets (sorted alphabetically)
  const allStatuses = useMemo(
    () => [...new Set(tickets.map((t) => t.status))].sort(),
    [tickets],
  )

  const groups = useMemo<EpicGroup[]>(() => {
    const filtered = tickets.filter((t) => {
      if (selectedStatuses.size > 0 && !selectedStatuses.has(t.status)) return false
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
  }, [tickets, searchQuery, selectedStatuses])

  const selectedTickets = useMemo(
    () => tickets.filter((t) => selectedIds.has(t.id)),
    [tickets, selectedIds],
  )

  const handleToggleStatus = (status: string) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
    setSelectedIds(new Set())
  }

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

  const handleRemoveSelected = () => {
    setTickets((prev) => prev.filter((t) => !selectedIds.has(t.id)))
    setSelectedIds(new Set())
    setFailedIds(new Set())
  }

  const handleConfirm = async () => {
    if (!selectedVersion) return
    setShowModal(false)

    const idsToAssign = [...selectedIds]
    const versionName = selectedVersion.name

    const result = await assignVersion(idsToAssign, selectedVersion.id).catch(() => ({
      succeeded: [] as string[],
      failed: idsToAssign,
    }))

    const succeededSet = new Set(result.succeeded)
    setTickets((prev) => prev.filter((t) => !succeededSet.has(t.id)))
    setFailedIds(new Set(result.failed))
    setSelectedIds(new Set(result.failed))
    setSelectedVersion(null)

    const count = result.succeeded.length
    if (count > 0) {
      setToast(`${count} ticket${count !== 1 ? 's' : ''} assigned to ${versionName}`)
      setTimeout(() => setToast(null), 3500)
    }
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

        {/* Status filter dropdown */}
        <div className="relative shrink-0" ref={statusDropdownRef}>
          <button
            type="button"
            onClick={() => setStatusDropdownOpen((o) => !o)}
            className="flex items-center gap-[6px] px-[10px] py-[6px] rounded-[8px] text-[12px] font-medium transition-colors"
            style={{
              background: 'var(--surface)',
              border: selectedStatuses.size > 0 ? '1px solid var(--accent)' : '1px solid var(--border-md)',
              color: selectedStatuses.size > 0 ? 'var(--accent)' : 'var(--text-2)',
            }}
          >
            Status
            {selectedStatuses.size > 0 && (
              <span
                className="text-[10px] font-bold px-[5px] py-[1px] rounded-full"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {selectedStatuses.size}
              </span>
            )}
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              width="10"
              height="10"
              style={{ transform: statusDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
            >
              <path d="M4 6l4 4 4-4" />
            </svg>
          </button>

          {statusDropdownOpen && allStatuses.length > 0 && (
            <div
              className="absolute left-0 top-[calc(100%+4px)] z-20 rounded-[8px] py-1 min-w-[160px]"
              style={{ background: 'var(--surface)', border: '1px solid var(--border-md)', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
            >
              {selectedStatuses.size > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedStatuses(new Set())}
                    className="w-full text-left px-[12px] py-[6px] text-[11px] font-medium transition-colors hover:opacity-70"
                    style={{ color: 'var(--accent)' }}
                  >
                    Clear all
                  </button>
                  <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
                </>
              )}
              {allStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleToggleStatus(status)}
                  className="w-full flex items-center gap-[8px] px-[12px] py-[7px] text-[12px] transition-colors hover:opacity-80"
                  style={{ color: 'var(--text-1)' }}
                >
                  <span
                    className="w-[14px] h-[14px] rounded-[3px] border flex items-center justify-center shrink-0"
                    style={{
                      background: selectedStatuses.has(status) ? 'var(--accent)' : 'transparent',
                      borderColor: selectedStatuses.has(status) ? 'var(--accent)' : 'var(--border-md)',
                    }}
                  >
                    {selectedStatuses.has(status) && (
                      <svg viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="1.5" width="8" height="8">
                        <path d="M1.5 5l2.5 2.5 4.5-4" />
                      </svg>
                    )}
                  </span>
                  {status}
                </button>
              ))}
            </div>
          )}
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
            const v = versions.find((ver) => ver.id === e.target.value) ?? null
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
          {versions.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>

        {/* Remove from list button — visible when tickets are selected */}
        {selectedIds.size > 0 && (
          <button
            type="button"
            onClick={handleRemoveSelected}
            className="flex items-center gap-[5px] px-[14px] py-[7px] rounded-[8px] text-[12px] font-semibold transition-opacity hover:opacity-80 shrink-0"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-md)', color: 'var(--text-2)' }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12">
              <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" />
            </svg>
            Remove from list
          </button>
        )}

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

      {/* Loading */}
      {isLoading && (
        <p className="text-[12px] text-center py-8" style={{ color: 'var(--text-3)' }}>
          Loading tickets…
        </p>
      )}

      {/* Table */}
      {!isLoading && (
        <VersionAssignmentTable
          groups={groups}
          selectedIds={selectedIds}
          failedIds={failedIds}
          onToggleTicket={handleToggleTicket}
          onToggleEpic={handleToggleEpic}
        />
      )}

      {/* Preview modal */}
      {showModal && selectedVersion && (
        <VersionAssignModal
          tickets={selectedTickets}
          version={selectedVersion}
          onConfirm={() => { void handleConfirm() }}
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
