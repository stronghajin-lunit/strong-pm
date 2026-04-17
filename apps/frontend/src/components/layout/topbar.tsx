'use client'

import { useUIStore } from '@/stores/ui-store'

export function Topbar() {
  const topbarTitle = useUIStore((s) => s.topbarTitle)

  return (
    <header
      className="h-[46px] shrink-0 flex items-center px-4 gap-[6px]"
      style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
    >
      <h1 className="text-[14px] font-semibold flex-1">{topbarTitle}</h1>

      <div className="flex items-center gap-[2px]">
        <IconButton aria-label="알림">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 2C5.8 2 4 3.8 4 6v4l-1.5 2h11L12 10V6c0-2.2-1.8-4-4-4Z" />
            <path d="M6.5 13.5c0 .8.7 1.5 1.5 1.5s1.5-.7 1.5-1.5" />
          </svg>
        </IconButton>

        <IconButton aria-label="설정">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="8" r="2.5" />
            <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.2 3.2l1 1M11.8 11.8l1 1M3.2 12.8l1-1M11.8 4.2l1-1" />
          </svg>
        </IconButton>
      </div>
    </header>
  )
}

interface IconButtonProps {
  'aria-label': string
  children: React.ReactNode
  onClick?: () => void
}

function IconButton({ 'aria-label': ariaLabel, children, onClick }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center border-none transition-colors"
      style={{ background: 'transparent', color: 'var(--text-2)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <span className="w-[15px] h-[15px]">{children}</span>
    </button>
  )
}
