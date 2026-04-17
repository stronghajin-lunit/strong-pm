import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import type { Project } from '@/types/project'

interface ProjectCardProps {
  project: Project
}

const PROGRESS_COLOR: Record<Project['status'], string> = {
  active: '#0F6E56',
  planning: '#854F0B',
  done: '#9B9A97',
}

const EMOJI_BG: Record<Project['status'], string> = {
  active: '#E1F5EE',
  planning: '#FAEEDA',
  done: '#ECEAE6',
}

export function ProjectCard({ project }: ProjectCardProps) {
  const router = useRouter()

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`프로젝트: ${project.name}`}
      onClick={() => router.push(`/projects/${project.id}`)}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/projects/${project.id}`)}
      className="rounded-[12px] border p-[16px_18px] cursor-pointer transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)]"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-[9px]">
        <div>
          <div className="text-[14px] font-semibold tracking-[-0.2px] mb-[3px]">
            {project.name}
          </div>
          <Badge status={project.status} />
        </div>
        <div
          className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[15px] shrink-0"
          style={{ background: EMOJI_BG[project.status] }}
          aria-hidden="true"
        >
          {project.emoji}
        </div>
      </div>

      {/* Description */}
      <p
        className="text-[11px] leading-[1.5] mb-[12px]"
        style={{ color: 'var(--text-3)' }}
      >
        {project.description}
      </p>

      {/* Progress bar */}
      <div
        className="h-[3px] rounded-[2px] mb-[9px] overflow-hidden"
        style={{ background: 'var(--surface-3)' }}
        role="progressbar"
        aria-valuenow={project.progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`진행률 ${project.progress}%`}
      >
        <div
          className="h-full rounded-[2px]"
          style={{
            width: `${project.progress}%`,
            background: PROGRESS_COLOR[project.status],
          }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span
          className="text-[11px] font-medium"
          style={{ color: PROGRESS_COLOR[project.status] }}
        >
          {project.progress}% complete
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
          {project.updatedAt}
        </span>
      </div>
    </div>
  )
}
