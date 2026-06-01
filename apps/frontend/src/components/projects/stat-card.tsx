interface StatCardProps {
  label: string
  value: number | string
  sub?: string
  highlight?: boolean
}

export function StatCard({ label, value, sub, highlight = false }: StatCardProps) {
  return (
    <div
      className="rounded-[12px] border p-[14px_18px]"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
    >
      <div
        className="text-[11px] font-medium uppercase tracking-[0.05em] mb-[5px]"
        style={{ color: 'var(--text-3)' }}
      >
        {label}
      </div>
      <div
        className="text-[26px] font-semibold tracking-[-0.5px]"
        style={{ color: highlight ? 'var(--teal)' : 'var(--text-1)' }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[11px] mt-[3px]" style={{ color: 'var(--text-3)' }}>
          {sub}
        </div>
      )}
    </div>
  )
}
