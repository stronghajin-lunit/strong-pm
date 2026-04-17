import type { SlackFilter } from '@/types/slack'

interface SlackFilterBarProps {
  activeFilter: SlackFilter
  count: number
  onFilter: (filter: SlackFilter) => void
}

const FILTERS: { value: SlackFilter; label: string }[] = [
  { value: 'all',      label: 'All'      },
  { value: 'unlinked', label: 'Unlinked' },
  { value: 'linked',   label: 'Linked'   },
]

export function SlackFilterBar({ activeFilter, count, onFilter }: SlackFilterBarProps) {
  return (
    <div
      className="flex items-center gap-[6px] px-5 py-[10px] shrink-0"
      style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
    >
      {FILTERS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          data-testid={`filter-btn-${value}`}
          onClick={() => onFilter(value)}
          className="px-[10px] py-[3px] rounded-[20px] text-[11px] font-medium border transition-all"
          style={
            activeFilter === value
              ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
              : { background: 'transparent', color: 'var(--text-2)', borderColor: 'var(--border-md)' }
          }
          aria-pressed={activeFilter === value}
        >
          {label}
        </button>
      ))}

      <span
        className="ml-auto text-[11px]"
        style={{ color: 'var(--text-3)' }}
        data-testid="filter-count"
      >
        {count} message{count !== 1 ? 's' : ''}
      </span>
    </div>
  )
}
