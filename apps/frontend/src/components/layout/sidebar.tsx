'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useProjectStore } from '@/stores/project-store'
import { useUIStore } from '@/stores/ui-store'
import { Badge } from '@/components/ui/badge'

export function Sidebar() {
  const pathname = usePathname()
  const projects = useProjectStore((s) => s.projects)
  const openNewProjectModal = useUIStore((s) => s.openNewProjectModal)
  const [isReleasesOpen, setIsReleasesOpen] = useState(true)
  const [isPMOpen, setIsPMOpen] = useState(true)

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const isReleasesActive = pathname.startsWith('/releases')
  const isPMActive = pathname.startsWith('/prd-writer') || pathname.startsWith('/jira-ticket-writer')

  return (
    <aside
      className="w-[224px] shrink-0 flex flex-col h-screen"
      style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
    >
      {/* Logo */}
      <div
        className="px-4 py-[14px] flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div
          className="w-[26px] h-[26px] rounded-[6px] flex items-center justify-center shrink-0"
          style={{ background: 'var(--accent)' }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="#fff">
            <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" />
          </svg>
        </div>
        <span className="text-[14px] font-semibold tracking-[-0.3px]">StrongPM</span>
      </div>

      {/* Top nav */}
      <nav
        className="p-2"
        style={{ borderBottom: '1px solid var(--border)' }}
        aria-label="주요 메뉴"
      >
        <NavItem href="/projects" label="Home" active={isActive('/projects')}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 6L8 2L14 6V14H10V10H6V14H2V6Z" />
          </svg>
        </NavItem>

        <div className="h-px my-1" style={{ background: 'var(--border)' }} />

        <NavItem href="/pr-tracker" label="PR Tracker" active={isActive('/pr-tracker')}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="4" cy="4" r="2" />
            <circle cx="4" cy="12" r="2" />
            <circle cx="12" cy="4" r="2" />
            <path d="M4 6v4M6 4h3a1 1 0 0 1 1 1v5" />
          </svg>
        </NavItem>

        <NavItem href="/slack" label="Slack Q&A Linker" active={isActive('/slack')}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M5.5 2a1.5 1.5 0 0 0 0 3H7V3.5A1.5 1.5 0 0 0 5.5 2z" />
            <path d="M10.5 2a1.5 1.5 0 0 1 0 3H9V3.5A1.5 1.5 0 0 1 10.5 2z" />
            <path d="M2 6.5h5v2H2zM9 6.5h5v2H9z" />
            <path d="M5.5 9a1.5 1.5 0 0 0-1.5 1.5V12h3v-1.5A1.5 1.5 0 0 0 5.5 9z" />
            <path d="M10.5 9a1.5 1.5 0 0 1 1.5 1.5V12H9v-1.5A1.5 1.5 0 0 1 10.5 9z" />
          </svg>
        </NavItem>

        <NavItem
          href="/sprint-report"
          label="Sprint Report Creator"
          active={isActive('/sprint-report')}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="3" width="12" height="10" rx="1" />
            <line x1="5" y1="7" x2="5" y2="11" />
            <line x1="8" y1="5" x2="8" y2="11" />
            <line x1="11" y1="8" x2="11" y2="11" />
          </svg>
        </NavItem>
      </nav>

      {/* Scrollable section */}
      <div className="flex-1 overflow-y-auto p-2 pt-2">
        {/* Projects */}
        <div
          className="text-[10px] font-semibold uppercase tracking-[0.06em] px-2 pb-[6px] pt-1"
          style={{ color: 'var(--text-3)' }}
        >
          Projects
        </div>
        <div className="flex flex-col gap-[1px]">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="flex items-center gap-2 px-2 py-[6px] rounded-[8px] transition-colors"
              style={
                isActive(`/projects/${project.id}`)
                  ? { background: 'var(--accent-light)' }
                  : undefined
              }
              onMouseEnter={(e) => {
                if (!isActive(`/projects/${project.id}`)) {
                  e.currentTarget.style.background = 'var(--surface-2)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(`/projects/${project.id}`)) {
                  e.currentTarget.style.background = ''
                }
              }}
            >
              <span
                className="w-[7px] h-[7px] rounded-full shrink-0"
                style={{ background: project.status === 'active' ? 'var(--teal)' : project.status === 'planning' ? 'var(--amber)' : 'var(--text-3)' }}
              />
              <span className="text-[13px] font-medium flex-1 truncate">{project.name}</span>
              <Badge status={project.status} />
            </Link>
          ))}
        </div>

        {/* Project Management accordion */}
        <div className="h-px my-2" style={{ background: 'var(--border)' }} />

        <button
          type="button"
          onClick={() => setIsPMOpen((prev) => !prev)}
          className="w-full flex items-center gap-[5px] px-2 py-[3px] pb-[5px] cursor-pointer"
        >
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.07em] flex-1 text-left"
            style={{ color: isPMActive ? 'var(--accent)' : 'var(--text-3)' }}
          >
            Project Management
          </span>
          <span
            className="transition-transform duration-[180ms]"
            style={{
              color: 'var(--text-3)',
              transform: isPMOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
            }}
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              width="11"
              height="11"
            >
              <polyline points="4,6 8,10 12,6" />
            </svg>
          </span>
        </button>

        {isPMOpen && (
          <div className="flex flex-col gap-[1px]">
            <NavItem
              href="/prd-writer"
              label="PRD Writer"
              active={isActive('/prd-writer')}
              sub
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 2h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
                <line x1="5" y1="6" x2="11" y2="6" />
                <line x1="5" y1="9" x2="9" y2="9" />
                <line x1="5" y1="12" x2="7" y2="12" />
              </svg>
            </NavItem>
            <NavItem
              href="/jira-ticket-writer"
              label="Jira Ticket Writer"
              active={isActive('/jira-ticket-writer')}
              sub
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="2" width="12" height="12" rx="2" />
                <line x1="5" y1="8" x2="11" y2="8" />
                <line x1="8" y1="5" x2="8" y2="11" />
              </svg>
            </NavItem>
          </div>
        )}

        {/* Releases accordion */}
        <div className="h-px my-2" style={{ background: 'var(--border)' }} />

        <button
          type="button"
          onClick={() => setIsReleasesOpen((prev) => !prev)}
          className="w-full flex items-center gap-[5px] px-2 py-[3px] pb-[5px] cursor-pointer"
        >
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.07em] flex-1 text-left"
            style={{ color: isReleasesActive ? 'var(--accent)' : 'var(--text-3)' }}
          >
            Releases
          </span>
          <span
            className="transition-transform duration-[180ms]"
            style={{
              color: 'var(--text-3)',
              transform: isReleasesOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
            }}
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              width="11"
              height="11"
            >
              <polyline points="4,6 8,10 12,6" />
            </svg>
          </span>
        </button>

        {isReleasesOpen && (
          <div className="flex flex-col gap-[1px]">
            <NavItem
              href="/releases/notes"
              label="Release Note Creator"
              active={isActive('/releases/notes')}
              sub
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 2h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
                <line x1="5" y1="6" x2="11" y2="6" />
                <line x1="5" y1="9" x2="9" y2="9" />
              </svg>
            </NavItem>
            <NavItem
              href="/releases/deployment"
              label="Deployment Tracker"
              active={isActive('/releases/deployment')}
              sub
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="8" cy="8" r="6" />
                <polyline points="8,5 8,8 10,10" />
              </svg>
            </NavItem>
          </div>
        )}
      </div>

      {/* New Project */}
      <button
        type="button"
        onClick={openNewProjectModal}
        className="flex items-center gap-[6px] px-4 py-2 text-[12px] transition-colors"
        style={{
          color: 'var(--text-3)',
          borderTop: '1px solid var(--border)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="8" y1="3" x2="8" y2="13" />
          <line x1="3" y1="8" x2="13" y2="8" />
        </svg>
        New Project
      </button>

      {/* Footer */}
      <div className="p-2" style={{ borderTop: '1px solid var(--border)' }}>
        <div
          className="flex items-center gap-2 px-2 py-[6px] rounded-[8px] text-[13px] font-medium"
          style={{ color: 'var(--text-2)' }}
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            width="14"
            height="14"
          >
            <circle cx="8" cy="6" r="3" />
            <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
          </svg>
          PM User
        </div>
      </div>
    </aside>
  )
}

interface NavItemProps {
  href: string
  label: string
  active: boolean
  sub?: boolean
  children: React.ReactNode
}

function NavItem({ href, label, active, sub = false, children }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-[8px] text-[13px] font-medium transition-colors ${sub ? 'pl-[22px] py-[6px] pr-2 text-[12px]' : 'px-2 py-[6px]'}`}
      style={
        active
          ? { background: 'var(--accent-light)', color: 'var(--accent)' }
          : { color: 'var(--text-2)' }
      }
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'var(--surface-2)'
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = ''
      }}
    >
      <span className="w-[14px] h-[14px] shrink-0">{children}</span>
      {label}
    </Link>
  )
}
