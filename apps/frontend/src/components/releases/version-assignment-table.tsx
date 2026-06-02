'use client'

import React, { useRef, useEffect } from 'react'
import type { EpicGroup, JiraTicket } from '@/types/version-assignment'

type TicketStatus = JiraTicket['status']

const _DEFAULT_STATUS_CFG = { bg: '#F0F0F0', color: '#767676' }

const STATUS_CONFIG: Record<string, { bg: string; color: string }> = {
  'To Do':       { bg: '#F0F0F0', color: '#767676' },
  'In Progress': { bg: '#FAEEDA', color: '#854F0B' },
  'In Review':   { bg: '#EFF6FF', color: '#1E40AF' },
  'In Development': { bg: '#FAEEDA', color: '#854F0B' },
  'Done':        { bg: '#ECEAE6', color: '#9B9A97' },
  'Closed':      { bg: '#ECEAE6', color: '#9B9A97' },
}

function getStatusCfg(status: string) {
  return STATUS_CONFIG[status] ?? _DEFAULT_STATUS_CFG
}

interface Props {
  groups: EpicGroup[]
  selectedIds: Set<string>
  failedIds: Set<string>
  onToggleTicket: (id: string) => void
  onToggleEpic: (epicId: string | null) => void
}

function IndeterminateCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean
  indeterminate: boolean
  onChange: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="w-[14px] h-[14px] rounded-[3px] cursor-pointer"
      style={{ accentColor: 'var(--accent)' }}
    />
  )
}

export function VersionAssignmentTable({ groups, selectedIds, failedIds, onToggleTicket, onToggleEpic }: Props) {
  const hasTickets = groups.some((g) => g.tickets.length > 0)

  if (!hasTickets) {
    return (
      <div className="rounded-[12px] overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="py-14 flex flex-col items-center gap-2">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" width="28" height="28" className="opacity-30" style={{ color: 'var(--text-3)' }}>
            <rect x="2" y="5" width="12" height="9" rx="1" />
            <path d="M2 9h12M5 5V3.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V5" />
          </svg>
          <p className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>No unversioned tickets found</p>
          <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>All tickets in this period have a release version.</p>
        </div>
      </div>
    )
  }

  const rows: React.ReactNode[] = []

  groups.forEach((group, gi) => {
    const allSelected = group.tickets.length > 0 && group.tickets.every((t) => selectedIds.has(t.id))
    const someSelected = group.tickets.some((t) => selectedIds.has(t.id))

    rows.push(
      <tr
        key={`epic-${group.epicId ?? 'none'}`}
        style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}
      >
        <td className="px-[14px] py-[8px]">
          <IndeterminateCheckbox
            checked={allSelected}
            indeterminate={!allSelected && someSelected}
            onChange={() => onToggleEpic(group.epicId)}
          />
        </td>
        <td colSpan={4} className="px-[14px] py-[8px]">
          <div className="flex items-center gap-[8px]">
            <span className="text-[12px] font-semibold" style={{ color: 'var(--text-1)' }}>
              {group.epicName ?? '(No Epic)'}
            </span>
            <span
              className="text-[10px] font-semibold px-[6px] py-[1px] rounded-full"
              style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
            >
              {group.tickets.length}
            </span>
          </div>
        </td>
      </tr>
    )

    group.tickets.forEach((ticket, ti) => {
      const isLast = gi === groups.length - 1 && ti === group.tickets.length - 1
      const isFailed = failedIds.has(ticket.id)
      const statusCfg = getStatusCfg(ticket.status)

      rows.push(
        <tr
          key={ticket.id}
          className="transition-colors"
          style={{
            borderBottom: isLast ? undefined : '1px solid var(--border)',
            background: isFailed ? '#FFF5F5' : undefined,
          }}
          onMouseEnter={(e) => { if (!isFailed) e.currentTarget.style.background = 'var(--accent-light)' }}
          onMouseLeave={(e) => { if (!isFailed) e.currentTarget.style.background = '' }}
        >
          <td className="px-[14px] py-[11px] pl-[24px]">
            <input
              type="checkbox"
              checked={selectedIds.has(ticket.id)}
              onChange={() => onToggleTicket(ticket.id)}
              className="w-[14px] h-[14px] cursor-pointer"
              style={{ accentColor: 'var(--accent)' }}
            />
          </td>
          <td className="px-[14px] py-[11px]">
            <span className="text-[12px] font-semibold font-mono" style={{ color: 'var(--accent)' }}>
              {ticket.id}
            </span>
          </td>
          <td className="px-[14px] py-[11px]">
            <span className="text-[12px]" style={{ color: 'var(--text-1)' }}>
              {ticket.summary}
            </span>
            {isFailed && (
              <span className="ml-2 text-[11px] font-medium" style={{ color: '#DC2626' }}>
                ⚠ Failed to assign
              </span>
            )}
          </td>
          <td className="px-[14px] py-[11px]">
            <span
              className="text-[11px] font-semibold px-[7px] py-[2px] rounded-[5px] whitespace-nowrap"
              style={{ background: statusCfg.bg, color: statusCfg.color }}
            >
              {ticket.status}
            </span>
          </td>
          <td className="px-[14px] py-[11px] text-[12px]" style={{ color: 'var(--text-3)' }}>
            {ticket.currentVersion ?? '—'}
          </td>
        </tr>
      )
    })
  })

  return (
    <div className="rounded-[12px] overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <table className="w-full border-collapse">
        <thead>
          <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
            <th className="px-[14px] py-[9px] w-[44px]" />
            <th className="text-left px-[14px] py-[9px]" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', width: 120 }}>
              Ticket ID
            </th>
            <th className="text-left px-[14px] py-[9px]" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Summary
            </th>
            <th className="text-left px-[14px] py-[9px]" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', width: 110 }}>
              Status
            </th>
            <th className="text-left px-[14px] py-[9px]" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', width: 150 }}>
              Current Version
            </th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  )
}
