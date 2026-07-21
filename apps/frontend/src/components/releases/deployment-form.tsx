'use client'

import { useState } from 'react'
import type {
  JiraVersionOption,
  DeploymentResult,
  DeploymentFilter,
  DeployStatus,
  TicketRow,
} from '@/types/release'

function sliceVersionsByDate(versions: JiraVersionOption[]): JiraVersionOption[] {
  const dated = versions
    .map((v, originalIndex) => ({ v, originalIndex, date: v.release_date ? new Date(v.release_date).getTime() : null }))
    .filter((x): x is { v: JiraVersionOption; originalIndex: number; date: number } => x.date !== null)
    .sort((a, b) => a.date - b.date)

  if (dated.length === 0) return versions

  const now = Date.now()
  let closestIdx = 0
  let minDiff = Math.abs(dated[0].date - now)
  for (let i = 1; i < dated.length; i++) {
    const diff = Math.abs(dated[i].date - now)
    if (diff < minDiff) { minDiff = diff; closestIdx = i }
  }

  const sliced = dated.slice(Math.max(0, closestIdx - 6), closestIdx + 7)
  const undated = versions.filter((v) => !v.release_date)
  return [...sliced.map((x) => x.v), ...undated]
}

interface DeploymentFormProps {
  versionOptions: JiraVersionOption[]
  deploymentData?: Record<string, DeploymentResult>
  onRun?: (versionId: string) => Promise<DeploymentResult>
  onRunComplete?: (result: DeploymentResult) => void
  initialResult?: DeploymentResult
}

const DEPLOY_STATUS_CONFIG: Record<DeployStatus, { label: string; bg: string; color: string }> = {
  'deployed-this': { label: 'Deployed',     bg: '#EFF6FF', color: '#1E40AF' },
  'deployed-prev': { label: 'Prev Release', bg: '#FAEEDA', color: '#854F0B' },
  'no-pr':         { label: 'No PR',        bg: '#FAECE7', color: '#993C1D' },
  'unregistered':  { label: 'Unregistered', bg: '#FAEEDA', color: '#854F0B' },
}

const STAT_LABEL_COLOR: Record<string, string> = {
  'Tickets without PR': 'var(--coral)',
  'Deployed (This Release)': 'var(--accent)',
  'Deployed (Prev Release)': 'var(--amber)',
}

export function DeploymentForm({ versionOptions, deploymentData, onRun, onRunComplete, initialResult }: DeploymentFormProps) {
  const filteredVersionOptions = sliceVersionsByDate(versionOptions)
  const [selectedVersionId, setSelectedVersionId] = useState('')
  const [result, setResult] = useState<DeploymentResult | null>(initialResult ?? null)
  const [activeFilter, setActiveFilter] = useState<DeploymentFilter>('all')
  const [isLoading, setIsLoading] = useState(false)
  const readOnly = initialResult !== undefined

  const handleRun = async () => {
    if (onRun) {
      setIsLoading(true)
      try {
        const data = await onRun(selectedVersionId)
        setResult(data)
        setActiveFilter('all')
        onRunComplete?.(data)
      } finally {
        setIsLoading(false)
      }
    } else {
      const data = deploymentData?.[selectedVersionId]
      if (!data) return
      setResult(data)
      setActiveFilter('all')
      onRunComplete?.(data)
    }
  }

  const filteredTickets: TicketRow[] = result
    ? activeFilter === 'all'
      ? result.ticketRows
      : result.ticketRows.filter((t) => t.status === activeFilter)
    : []

  return (
    <div>
      {/* Config card — hidden in read-only (detail) mode */}
      {!readOnly && <div
        className="rounded-[12px] p-5 mb-3"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div
          className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-[14px]"
          style={{ color: 'var(--text-3)' }}
        >
          Configuration
        </div>
        <div>
          <label className="block text-[11px] font-semibold mb-[5px]" style={{ color: 'var(--text-2)' }}>
            AICP Jira Version{' '}
            <span
              className="text-[11px] font-normal px-[6px] py-[1px] rounded-[6px]"
              style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
            >
              Required
            </span>
          </label>
          <select
            data-testid="dt-version-select"
            value={selectedVersionId}
            onChange={(e) => setSelectedVersionId(e.target.value)}
            className="w-full rounded-[6px] px-[10px] py-2 text-[13px] outline-none"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border-md)',
              color: 'var(--text-1)',
            }}
          >
            <option value="">— Select version —</option>
            {filteredVersionOptions.map((v) => (
              <option key={v.id} value={v.id}>{v.label}</option>
            ))}
          </select>
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>
            Issues are collected based on Jira Fix Version. PRs and merge status are cross-referenced from GitHub.
          </p>
        </div>
      </div>}

      {/* Run button — hidden in read-only mode */}
      {!readOnly && <div className="flex justify-end mb-6">
        <button
          type="button"
          data-testid="dt-run-btn"
          onClick={handleRun}
          disabled={!selectedVersionId || isLoading}
          className="flex items-center gap-[6px] px-[22px] py-[10px] rounded-[8px] text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'var(--accent)' }}
        >
          {isLoading ? (
            <svg viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" width="12" height="12" className="animate-spin">
              <circle cx="8" cy="8" r="6" strokeOpacity="0.3" />
              <path d="M8 2a6 6 0 0 1 6 6" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" fill="#fff" width="12" height="12">
              <polygon points="4,2 14,8 4,14" />
            </svg>
          )}
          {isLoading ? 'Running…' : 'Run'}
        </button>
      </div>}

      {/* Results */}
      {result && (
        <div data-testid="dt-results">
          <div
            className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-[9px]"
            style={{ color: 'var(--text-3)' }}
          >
            {result.title} — Analysis
          </div>

          {/* Summary stat cards */}
          <div className="grid grid-cols-4 gap-[10px] mb-5" data-testid="dt-stat-cards">
            {[
              { label: 'Total Jira Tickets',       value: result.stats.total,                color: 'var(--text-1)'  },
              { label: 'Tickets with PR',           value: result.stats.withPR,               color: 'var(--teal)'   },
              { label: 'Tickets without PR',        value: result.stats.noPR,                 color: result.stats.noPR > 0 ? 'var(--coral)' : 'var(--text-3)' },
              { label: 'Unregistered PRs',          value: result.unregisteredPRs.count,      color: result.unregisteredPRs.count > 0 ? 'var(--amber)' : 'var(--text-3)' },
              { label: 'Merged PRs',                value: result.stats.merged,               color: 'var(--teal)'   },
              { label: 'Deployed (This Release)',   value: result.stats.deployedThis,         color: 'var(--accent)' },
              { label: 'Deployed (Prev Release)',   value: result.stats.deployedPrev,         color: 'var(--amber)'  },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="rounded-[12px] p-[14px_18px]"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <div
                  className="text-[11px] font-medium uppercase tracking-[0.05em] mb-[6px]"
                  style={{ color: 'var(--text-3)' }}
                >
                  {label}
                </div>
                <div
                  data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}
                  className="text-[26px] font-semibold tracking-[-0.5px]"
                  style={{ color }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Analysis block */}
          <div
            className="rounded-[12px] p-[16px_18px] mb-3"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            {/* Repos */}
            <div className="text-[13px] font-semibold mb-[10px]">Repos in this release</div>
            <div className="flex flex-wrap gap-[6px]" data-testid="dt-repos">
              {result.repos.map((repo) => (
                <span
                  key={repo}
                  className="text-[11px] font-mono rounded-[5px] px-[7px] py-[2px]"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border-md)',
                    color: 'var(--text-1)',
                  }}
                >
                  {repo}
                </span>
              ))}
            </div>

            {/* No-PR tickets */}
            {result.noPRTickets.length > 0 ? (
              <div className="mt-2" data-testid="dt-no-pr-tickets">
                <div
                  className="text-[11px] font-semibold uppercase tracking-[0.05em] mb-[5px]"
                  style={{ color: 'var(--text-3)' }}
                >
                  Tickets without PR
                </div>
                <div className="flex flex-wrap gap-[5px]">
                  {result.noPRTickets.map((t) => (
                    <span
                      key={t}
                      className="text-[11px] font-mono rounded-[5px] px-[7px] py-[2px]"
                      style={{ background: '#FAECE7', color: '#993C1D' }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p
                className="mt-2 text-[12px]"
                style={{ color: 'var(--teal)' }}
                data-testid="dt-all-linked"
              >
                ✓ All tickets have linked PRs
              </p>
            )}

            {/* Previously deployed tickets (in this version but PR already shipped in a prior release) */}
            {result.stats.deployedPrev > 0 && (() => {
              const prevTickets = result.ticketRows
                .filter((t) => t.status === 'deployed-prev')
                .map((t) => t.id)
              return (
                <div className="mt-2" data-testid="dt-prev-deployed">
                  <div
                    className="text-[11px] font-semibold uppercase tracking-[0.05em] mb-[4px]"
                    style={{ color: 'var(--text-3)' }}
                  >
                    Previously deployed — {prevTickets.length} ticket{prevTickets.length !== 1 ? 's' : ''}
                  </div>
                  <p className="text-[11px] mb-[5px]" style={{ color: 'var(--text-3)' }}>
                    These tickets are in this Jira version but their PRs were already included in an earlier release.
                  </p>
                  <div className="flex flex-wrap gap-[5px]">
                    {prevTickets.map((t) => (
                      <span
                        key={t}
                        className="text-[11px] font-mono rounded-[5px] px-[7px] py-[2px]"
                        style={{ background: '#FAEEDA', color: '#854F0B' }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Unregistered PRs */}
            {result.unregisteredPRs.count > 0 && (
              <div className="mt-2" data-testid="dt-unregistered-prs">
                <div
                  className="text-[11px] font-semibold uppercase tracking-[0.05em] mb-[5px]"
                  style={{ color: 'var(--text-3)' }}
                >
                  Version-unregistered PRs — {result.unregisteredPRs.count} total
                </div>
                {result.unregisteredPRs.tickets.length > 0 && (
                  <div className="flex flex-wrap gap-[5px] mb-[7px]">
                    {result.unregisteredPRs.tickets.map((t) => (
                      <span
                        key={t}
                        className="text-[11px] font-mono rounded-[5px] px-[7px] py-[2px]"
                        style={{ background: '#FAEEDA', color: '#854F0B' }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {result.unregisteredPRs.breakdown && (
                  <div className="flex gap-2">
                    <span className="text-[11px] px-2 py-[2px] rounded-[6px]" style={{ background: '#FAECE7', color: '#993C1D' }}>
                      Deploy needed: {result.unregisteredPRs.breakdown.needed}
                    </span>
                    <span className="text-[11px] px-2 py-[2px] rounded-[6px]" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>
                      Not needed: {result.unregisteredPRs.breakdown.notNeeded}
                    </span>
                    <span className="text-[11px] px-2 py-[2px] rounded-[6px]" style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}>
                      No ticket: {result.unregisteredPRs.breakdown.noTicket}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ticket table */}
          <div
            className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2"
            style={{ color: 'var(--text-3)' }}
          >
            Ticket Details
          </div>

          {/* Filter bar */}
          <div className="flex gap-[5px] mb-[10px]">
            {(
              [
                { value: 'all',           label: `All (${result.ticketRows.length})` },
                { value: 'deployed-this', label: `Deployed This (${result.stats.deployedThis})` },
                { value: 'deployed-prev', label: `Deployed Prev (${result.stats.deployedPrev})` },
                { value: 'no-pr',         label: `No PR (${result.stats.noPR})` },
                { value: 'unregistered',  label: 'Unregistered PR' },
              ] as { value: DeploymentFilter; label: string }[]
            ).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                data-testid={`dt-filter-${value}`}
                onClick={() => setActiveFilter(value)}
                aria-pressed={activeFilter === value}
                className="px-[10px] py-[3px] rounded-[20px] text-[11px] font-medium border transition-all"
                style={
                  activeFilter === value
                    ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                    : { background: 'transparent', color: 'var(--text-2)', borderColor: 'var(--border-md)' }
                }
              >
                {label}
              </button>
            ))}
          </div>

          {/* Ticket table */}
          <div
            className="rounded-[12px] overflow-hidden"
            style={{ border: '1px solid var(--border)' }}
          >
            <table className="w-full border-collapse" style={{ background: 'var(--surface)' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  {['Ticket', 'Title', 'PR', 'Merged', 'Deploy Status'].map((col) => (
                    <th
                      key={col}
                      className="text-left px-[14px] py-2"
                      style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody data-testid="dt-ticket-tbody">
                {filteredTickets.map((ticket, idx) => {
                  const statusCfg = DEPLOY_STATUS_CONFIG[ticket.status]
                  return (
                    <tr
                      key={ticket.id}
                      data-testid={`ticket-row-${ticket.id}`}
                      className="transition-colors"
                      style={idx < filteredTickets.length - 1 ? { borderBottom: '1px solid var(--border)' } : undefined}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                    >
                      <td className="px-[14px] py-[9px] text-[11px] font-mono font-medium" style={{ color: 'var(--accent)' }}>
                        {ticket.id}
                      </td>
                      <td className="px-[14px] py-[9px] text-[12px]">{ticket.title}</td>
                      <td className="px-[14px] py-[9px] text-[11px] font-mono" style={{ color: 'var(--text-3)' }}>
                        {ticket.pr ?? '—'}
                      </td>
                      <td className="px-[14px] py-[9px] text-[12px]" style={{ color: ticket.merged ? 'var(--teal)' : 'var(--text-3)' }}>
                        {ticket.merged === null ? '—' : ticket.merged ? '✓' : '✗'}
                      </td>
                      <td className="px-[14px] py-[9px]">
                        <span
                          data-testid={`ticket-status-${ticket.id}`}
                          className="text-[11px] font-semibold px-[7px] py-[2px] rounded-[7px]"
                          style={{ background: statusCfg.bg, color: statusCfg.color }}
                        >
                          {statusCfg.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
