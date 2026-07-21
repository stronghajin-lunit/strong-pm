import type { SlackFilter } from '@/types/slack'

interface SlackFilterBarProps {
  activeFilter: SlackFilter
  count: number
  onFilter: (filter: SlackFilter) => void
}

const FILTERS: { value: SlackFilter; label: string }[] = [
  { value: 'all',      label: 'All'     },
  { value: 'archived', label: 'Archive' },
]

export function SlackFilterBar({ activeFilter, count, onFilter }: SlackFilterBarProps) {
  const isArchive = activeFilter === 'archived'

  return (
    <div
      className="flex items-center gap-[6px] px-5 py-[10px] shrink-0"
      style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
    >
      {FILTERS.map(({ value, label }) => {
        const isActive = activeFilter === value
        const isArchiveTab = value === 'archived'
        return (
          <button
            key={value}
            type="button"
            data-testid={`filter-btn-${value}`}
            onClick={() => onFilter(value)}
            className="flex items-center gap-[4px] px-[10px] py-[3px] rounded-[20px] text-[11px] font-medium border transition-all"
            style={
              isActive
                ? { background: isArchiveTab ? 'var(--amber)' : 'var(--accent)', color: '#fff', borderColor: isArchiveTab ? 'var(--amber)' : 'var(--accent)' }
                : { background: 'transparent', color: 'var(--text-2)', borderColor: 'var(--border-md)' }
            }
            aria-pressed={isActive}
          >
            {isArchiveTab && (
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" width="10" height="10">
                <rect x="1" y="4" width="14" height="10" rx="1" />
                <path d="M1 4h14M6 8h4" />
              </svg>
            )}
            {label}
          </button>
        )
      })}

      <span
        className="ml-auto text-[11px]"
        style={{ color: isArchive ? 'var(--amber)' : 'var(--text-3)' }}
        data-testid="filter-count"
      >
        {isArchive ? `${count} archived` : `${count} message${count !== 1 ? 's' : ''}`}
      </span>
    </div>
  )
}
