import type { SlackItem as SlackItemType, SlackThread } from '@/types/slack'
import type { Project } from '@/types/project'

interface SlackItemProps {
  item: SlackItemType
  projects: Project[]
  linkedProjectId: string | null
  onLink: (itemId: string, projectId: string | null) => void
}

export function SlackItem({ item, projects, linkedProjectId, onLink }: SlackItemProps) {
  const isLinked = linkedProjectId !== null
  const aiProject = projects.find((p) => p.id === item.aiProjectId)

  return (
    <div
      data-testid={`slack-item-${item.id}`}
      className="rounded-[12px] p-[14px_16px] mb-2 transition-shadow"
      style={{
        background: 'var(--surface)',
        border: isLinked ? '1px solid var(--teal)' : '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-[10px] mb-2">
        <div
          className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[12px] font-bold text-white shrink-0 font-mono"
          style={{ background: '#4A154B' }}
          aria-hidden="true"
        >
          {item.user}
        </div>
        <div className="flex-1">
          <span className="text-[12px] font-semibold">{item.name}</span>
          <span className="text-[10px] ml-[6px]" style={{ color: 'var(--text-3)' }}>
            {item.time}
          </span>
          <span className="text-[12px] ml-1" aria-hidden="true">:strong-pm:</span>
        </div>
      </div>

      {/* Body */}
      <p
        className="text-[12px] leading-[1.6] mb-[10px] pl-[42px]"
        style={{ color: 'var(--text-1)' }}
        data-testid={`slack-item-body-${item.id}`}
      >
        {renderTextWithMention(item.text)}
      </p>

      {/* Threads */}
      {item.threads.length > 0 && (
        <div className="pl-[42px] mb-[10px]">
          {item.threads.map((thread, idx) => (
            <ThreadItem key={idx} thread={thread} />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="pl-[42px] flex items-center gap-2">
        {/* AI suggestion tag */}
        <div
          data-testid={`slack-item-ai-tag-${item.id}`}
          className="flex items-center gap-1 text-[10px] font-medium px-2 py-[3px] rounded-[6px] whitespace-nowrap"
          style={
            aiProject
              ? { background: 'var(--accent-light)', color: 'var(--accent)' }
              : { background: 'var(--surface-3)', color: 'var(--text-3)' }
          }
        >
          {aiProject ? (
            <>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="10" height="10">
                <circle cx="8" cy="8" r="6" /><path d="M5 8l2 2 4-4" />
              </svg>
              AI suggests: {aiProject.name}
            </>
          ) : (
            <>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="10" height="10">
                <circle cx="8" cy="8" r="6" />
                <line x1="8" y1="5" x2="8" y2="8" />
                <circle cx="8" cy="11" r=".5" fill="currentColor" />
              </svg>
              No clear project match
            </>
          )}
        </div>

        {/* Project link select */}
        <select
          data-testid={`slack-item-select-${item.id}`}
          value={linkedProjectId ?? ''}
          onChange={(e) => onLink(item.id, e.target.value !== '' ? e.target.value : null)}
          className="rounded-[6px] px-2 py-[5px] text-[12px] outline-none cursor-pointer min-w-[200px] transition-colors"
          style={
            isLinked
              ? { border: '1px solid var(--teal)', background: 'var(--teal-light)', color: 'var(--teal)' }
              : { border: '1px solid var(--border-md)', background: 'var(--surface-2)', color: 'var(--text-1)' }
          }
          aria-label={`${item.name}의 메시지 프로젝트 연결`}
        >
          <option value="">— Select project —</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

function ThreadItem({ thread }: { thread: SlackThread }) {
  return (
    <div
      className="flex gap-2 py-[6px]"
      style={{ borderTop: '1px solid var(--border)' }}
    >
      <div
        className="w-[22px] h-[22px] rounded-[5px] flex items-center justify-center text-[10px] font-bold shrink-0"
        style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}
        aria-hidden="true"
      >
        {thread.user}
      </div>
      <div className="flex-1">
        <span className="text-[11px] font-semibold">{thread.name}</span>
        <span className="text-[10px] ml-[5px]" style={{ color: 'var(--text-3)' }}>
          {thread.time}
        </span>
        <p className="text-[11px] mt-[1px] leading-[1.5]" style={{ color: 'var(--text-2)' }}>
          {thread.text}
        </p>
      </div>
    </div>
  )
}

function renderTextWithMention(text: string): React.ReactNode {
  const parts = text.split('@strong-pm')
  return parts.map((part, idx) => (
    <span key={idx}>
      {part}
      {idx < parts.length - 1 && (
        <span className="font-medium" style={{ color: 'var(--accent)' }}>
          @strong-pm
        </span>
      )}
    </span>
  ))
}
