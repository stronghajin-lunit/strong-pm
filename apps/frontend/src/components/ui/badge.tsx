import type { ProjectStatus } from '@/types/project'

interface BadgeProps {
  status: ProjectStatus
}

const STATUS_CONFIG: Record<ProjectStatus, { label: string; bg: string; color: string }> = {
  active: {
    label: 'Active',
    bg: '#E1F5EE',
    color: '#0F6E56',
  },
  planning: {
    label: 'Planning',
    bg: '#FAEEDA',
    color: '#854F0B',
  },
  done: {
    label: 'Done',
    bg: '#ECEAE6',
    color: '#9B9A97',
  },
}

export function Badge({ status }: BadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <span
      data-testid="badge"
      data-status={status}
      style={{ backgroundColor: config.bg, color: config.color }}
      className="text-[10px] font-semibold px-[7px] py-[1px] rounded-[10px] whitespace-nowrap"
    >
      {config.label}
    </span>
  )
}
