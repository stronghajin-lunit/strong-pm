'use client'

import { useState } from 'react'
import type { PullRequest } from '@/types/pr'
import type { Project } from '@/types/project'

interface PRTableProps {
  prs: PullRequest[]
  projects: Project[]
}

const thStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 600,
  color: 'var(--text-3)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

export function PRTable({ prs, projects }: PRTableProps) {
  const [linkedMap, setLinkedMap] = useState<Record<string, string | null>>(
    Object.fromEntries(prs.map((pr) => [pr.id, pr.linkedProjectId])),
  )

  const handleLink = (prId: string, projectId: string | null) => {
    setLinkedMap((prev) => ({ ...prev, [prId]: projectId }))
  }

  return (
    <div
      className="rounded-[12px] overflow-hidden"
      style={{ border: '1px solid var(--border)' }}
    >
      <table className="w-full border-collapse" style={{ background: 'var(--surface)' }}>
        <thead>
          <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
            <th className="text-left px-3 py-2" style={thStyle}>PR Title / Summary</th>
            <th className="text-left px-3 py-2 w-[120px]" style={thStyle}>Author</th>
            <th className="text-left px-3 py-2 w-[100px]" style={thStyle}>Repo</th>
            <th className="text-left px-3 py-2 w-[110px]" style={thStyle}>Date</th>
            <th className="text-left px-3 py-2 w-[180px]" style={thStyle}>Linked Project</th>
          </tr>
        </thead>
        <tbody>
          {prs.map((pr, idx) => {
            const linkedProjectId = linkedMap[pr.id]
            const isLinked = linkedProjectId !== null

            return (
              <tr
                key={pr.id}
                data-testid={`pr-row-${pr.id}`}
                className="transition-colors"
                style={idx < prs.length - 1 ? { borderBottom: '1px solid var(--border)' } : undefined}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
              >
                {/* Title + description */}
                <td className="px-3 py-[9px] align-middle">
                  <span
                    className="block text-[12px] font-medium truncate max-w-[320px]"
                    style={{ color: 'var(--text-1)' }}
                    title={pr.title}
                  >
                    {pr.title}
                  </span>
                  <span
                    className="block text-[11px] truncate max-w-[320px] mt-[1px]"
                    style={{ color: 'var(--text-3)' }}
                  >
                    {pr.description}
                  </span>
                </td>

                {/* Author */}
                <td className="px-3 py-[9px] align-middle" data-testid={`pr-author-${pr.id}`}>
                  <div className="flex items-center gap-[6px]">
                    <img
                      src={pr.author.avatarUrl}
                      alt={pr.author.login}
                      className="w-[20px] h-[20px] rounded-full shrink-0"
                      style={{ border: '1px solid var(--border-md)' }}
                    />
                    <span className="text-[11px] truncate" style={{ color: 'var(--text-2)' }}>
                      {pr.author.login}
                    </span>
                  </div>
                </td>

                {/* Repo */}
                <td className="px-3 py-[9px] align-middle">
                  <span
                    className="text-[11px] font-mono"
                    style={{ color: 'var(--text-3)' }}
                  >
                    {pr.repo}
                  </span>
                </td>

                {/* Date */}
                <td className="px-3 py-[9px] align-middle">
                  <span className="text-[11px] whitespace-nowrap" style={{ color: 'var(--text-3)' }}>
                    {pr.date}
                  </span>
                </td>

                {/* Linked project select */}
                <td className="px-3 py-[9px] align-middle">
                  <select
                    data-testid={`pr-project-select-${pr.id}`}
                    value={linkedProjectId ?? ''}
                    onChange={(e) =>
                      handleLink(pr.id, e.target.value !== '' ? e.target.value : null)
                    }
                    className="w-full rounded-[6px] px-[7px] py-[3px] text-[11px] outline-none cursor-pointer transition-colors"
                    style={
                      isLinked
                        ? { border: '1px solid var(--teal)', background: 'var(--teal-light)', color: 'var(--teal)' }
                        : { border: '1px solid var(--border-md)', background: 'var(--surface-2)', color: 'var(--text-1)' }
                    }
                    aria-label={`Link ${pr.title} to a project`}
                  >
                    <option value="">— Select —</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
