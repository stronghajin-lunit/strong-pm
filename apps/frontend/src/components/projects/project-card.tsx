import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import type { Project } from '@/types/project'

interface ProjectCardProps {
  project: Project
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
      <div className="mb-[9px]">
        <div className="text-[14px] font-semibold tracking-[-0.2px] mb-[3px]">
          {project.name}
        </div>
        <Badge status={project.status} />
      </div>

      {/* Description */}
      <p
        className="text-[11px] leading-[1.5] mb-[12px]"
        style={{ color: 'var(--text-3)' }}
      >
        {project.description}
      </p>

      {/* Footer */}
      <div className="flex justify-end">
        <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
          {project.updatedAt}
        </span>
      </div>
    </div>
  )
}
