'use client'

import { useRef, useEffect } from 'react'
import { useChatStore } from '@/stores/chat-store'

interface ChatPanelProps {
  onConfirm: (recordId: string, text: string) => void
}

export function ChatPanel({ onConfirm }: ChatPanelProps) {
  const { isOpen, context, messages, pendingText, closeChat, setPendingText, sendMessage, confirmReflection } = useChatStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  if (!isOpen || !context) return null

  const handleConfirm = () => {
    const text = confirmReflection()
    onConfirm(context.recordId, text)
    closeChat()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.2)' }}
        onClick={closeChat}
        data-testid="chat-panel-backdrop"
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col"
        style={{
          width: 380,
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
        }}
        data-testid="chat-panel"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <p className="text-[13px] font-semibold">Apply Analysis</p>
            <p className="text-[11px] mt-[2px]" style={{ color: 'var(--text-3)' }}>
              AI analyzes Confluence document changes
            </p>
          </div>
          <button
            type="button"
            onClick={closeChat}
            data-testid="chat-panel-close"
            className="flex items-center justify-center w-7 h-7 rounded-[6px] transition-colors hover:opacity-70"
            style={{ color: 'var(--text-3)' }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="max-w-[280px] text-[12px] leading-[1.6] px-3 py-2 rounded-[10px] whitespace-pre-wrap"
                style={
                  msg.role === 'ai'
                    ? { background: 'var(--surface-2)', color: 'var(--text-1)' }
                    : { background: 'var(--accent)', color: '#fff' }
                }
                data-testid={`chat-message-${idx}`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-4 flex flex-col gap-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex gap-2">
            <textarea
              value={pendingText}
              onChange={(e) => setPendingText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter additional content to apply…"
              rows={3}
              data-testid="chat-input"
              className="flex-1 text-[12px] resize-none rounded-[8px] px-3 py-2 outline-none"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text-1)',
              }}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!pendingText.trim()}
              data-testid="chat-send-btn"
              className="self-end px-3 py-2 rounded-[8px] text-[12px] font-medium transition-opacity disabled:opacity-40"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
            >
              Send
            </button>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            data-testid="chat-confirm-btn"
            className="w-full py-[9px] rounded-[8px] text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent)' }}
          >
            Confirm Apply
          </button>
        </div>
      </div>
    </>
  )
}
