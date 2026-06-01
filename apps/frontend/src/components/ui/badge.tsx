import type { ProjectStatus } from '@/types/project'

interface BadgeProps {
  status: ProjectStatus
}

const STATUS_CONFIG: Record<ProjectStatus, { label: string; bg: string; color: string }> = {
  not_started: {
    label: 'Not Started',
    bg: '#F0F0F0',
    color: '#767676',
  },
  planning: {
    label: 'Planning',
    bg: '#FAEEDA',
    color: '#854F0B',
  },
  active: {
    label: 'Active',
    bg: '#EFF6FF',
    color: '#1E40AF',
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
      className="text-[11px] font-semibold px-[7px] py-[1px] rounded-[5px] whitespace-nowrap"
    >
      {config.label}
    </span>
  )
}
