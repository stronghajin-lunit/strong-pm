import type { SlackItem as SlackItemType, SlackThread } from '@/types/slack'
import type { Project } from '@/types/project'

interface SlackItemProps {
  item: SlackItemType
  projects: Project[]
  linkedProjectId: string | null
  onLink: (itemId: string, projectId: string | null) => void
  onArchive: (itemId: string) => void
}

export function SlackItem({ item, projects, linkedProjectId, onLink, onArchive }: SlackItemProps) {
  const isLinked = linkedProjectId !== null
  const isDM = item.sourceType === 'dm'
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
          style={{ background: isDM ? '#6B5B9A' : '#4A154B' }}
          aria-hidden="true"
        >
          {item.user}
        </div>
        <div className="flex-1 flex items-center gap-[6px] flex-wrap">
          <span className="text-[12px] font-semibold">{item.name}</span>
          <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
            {item.time}
          </span>
          {isDM && (
            <span
              data-testid={`slack-item-dm-badge-${item.id}`}
              className="flex items-center gap-[3px] text-[10px] font-medium px-[6px] py-[1px] rounded-[5px]"
              style={{ background: '#EEE8FA', color: '#6B5B9A' }}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="9" height="9">
                <path d="M2 4h12v8H2z" /><polyline points="2,4 8,9 14,4" />
              </svg>
              DM
            </span>
          )}
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

      {/* AI Summary */}
      <div
        data-testid={`slack-item-summary-${item.id}`}
        className="mx-[0px] ml-[42px] mb-[10px] rounded-[8px] px-[12px] py-[10px]"
        style={{ background: 'var(--teal-light)', border: '1px solid var(--teal)' }}
      >
        <div className="flex items-center gap-[5px] mb-[6px]">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="11" height="11" style={{ color: 'var(--teal)' }}>
            <circle cx="8" cy="8" r="6" /><path d="M8 5v3l2 2" />
          </svg>
          <span className="text-[10px] font-semibold uppercase tracking-[0.05em]" style={{ color: 'var(--teal)' }}>
            AI Summary
          </span>
        </div>
        <div className="flex gap-[6px] mb-[4px]">
          <span className="text-[10px] font-bold shrink-0 mt-[1px]" style={{ color: 'var(--teal)' }}>Q</span>
          <p className="text-[11px] leading-[1.5]" style={{ color: 'var(--text-1)' }}>
            {item.summary.question}
          </p>
        </div>
        <div className="flex gap-[6px]">
          <span className="text-[10px] font-bold shrink-0 mt-[1px]" style={{ color: 'var(--teal)' }}>A</span>
          <p className="text-[11px] leading-[1.5]" style={{ color: 'var(--text-2)' }}>
            {item.summary.answer}
          </p>
        </div>
      </div>

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
          className="rounded-[6px] px-2 py-[5px] text-[12px] outline-none cursor-pointer min-w-[180px] transition-colors"
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

        {/* Reflect to PRD Q&A button */}
        <button
          type="button"
          data-testid={`slack-item-archive-btn-${item.id}`}
          disabled={!isLinked}
          onClick={() => onArchive(item.id)}
          className="ml-auto flex items-center gap-[5px] px-[12px] py-[5px] rounded-[6px] text-[11px] font-semibold transition-all whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
          style={
            isLinked
              ? { background: 'var(--teal)', color: '#fff', border: '1px solid var(--teal)' }
              : { background: 'var(--surface-2)', color: 'var(--text-3)', border: '1px solid var(--border-md)' }
          }
          title={isLinked ? 'PRD Q&A에 반영하고 보관' : '프로젝트를 먼저 연결해주세요'}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="10" height="10">
            <path d="M2 11V13h2l7-7-2-2z" /><path d="M12.5 3.5l-1-1a1 1 0 0 0-1.4 0L9 3.6l2 2z" />
          </svg>
          → PRD Q&A
        </button>
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
