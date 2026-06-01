import type { JiraTicket, JiraVersion } from '@/types/version-assignment'

interface Props {
  tickets: JiraTicket[]
  version: JiraVersion
  onConfirm: () => void
  onCancel: () => void
}

export function VersionAssignModal({ tickets, version, onConfirm, onCancel }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(13, 15, 20, 0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        className="rounded-[14px] w-[460px] max-h-[80vh] flex flex-col shadow-xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="text-[15px] font-semibold tracking-[-0.3px]">Assign Release Version</p>
          <p className="text-[12px] mt-[5px] leading-[1.5]" style={{ color: 'var(--text-3)' }}>
            {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} will be assigned to{' '}
            <span className="font-semibold" style={{ color: 'var(--accent)' }}>{version.name}</span>.
          </p>
        </div>

        {/* Ticket list */}
        <div className="overflow-y-auto flex-1 px-5 py-3">
          {tickets.map((t) => (
            <div key={t.id} className="flex items-baseline gap-[8px] py-[5px]">
              <span
                className="text-[11px] font-semibold font-mono shrink-0"
                style={{ color: 'var(--accent)' }}
              >
                {t.id}
              </span>
              <span className="text-[12px] leading-[1.4]" style={{ color: 'var(--text-2)' }}>
                {t.summary}
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div
          className="flex justify-end gap-2 px-5 pb-5 pt-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            type="button"
            onClick={onCancel}
            className="px-[14px] py-[7px] rounded-[7px] text-[12px] font-medium transition-opacity hover:opacity-80"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)', color: 'var(--text-2)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-[14px] py-[7px] rounded-[7px] text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent)' }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
