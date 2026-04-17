import type { Metadata } from 'next'
import { Manrope, Fira_Code } from 'next/font/google'
import { AppShell } from '@/components/layout/app-shell'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const firaCode = Fira_Code({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'StrongPM',
  description: 'AI-powered PM assistant',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${manrope.variable} ${firaCode.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
