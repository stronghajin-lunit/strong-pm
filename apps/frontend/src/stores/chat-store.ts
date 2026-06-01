import { create } from 'zustand'

export interface ChatMessage {
  role: 'ai' | 'user'
  content: string
}

export interface ReflectionContext {
  recordId: string
  recordType: 'sprint' | 'prd' | 'release-note'
  confluenceUrl: string
}

interface ChatState {
  isOpen: boolean
  context: ReflectionContext | null
  messages: ChatMessage[]
  pendingText: string
  openChat: (ctx: ReflectionContext) => void
  closeChat: () => void
  setPendingText: (text: string) => void
  sendMessage: () => void
  confirmReflection: () => string
}

const INITIAL_AI_MESSAGE =
  'Confluence 문서를 분석했습니다.\n\n원본 생성 문서 대비 현재 페이지의 주요 변경 사항:\n• 일부 섹션에 수동 수정 내용이 추가되어 있습니다\n• 용어 및 기술 세부 사항이 업데이트되어 있습니다\n\n이 내용들을 다음 생성 시 반영할 내용으로 저장할까요? 추가로 고려할 사항이 있으면 말씀해 주세요.'

const AI_REPLY =
  '알겠습니다. 해당 내용도 반영 노트에 포함하겠습니다. 추가 사항이 없으면 "반영 확정" 버튼을 눌러 완료하세요.'

export const useChatStore = create<ChatState>((set, get) => ({
  isOpen: false,
  context: null,
  messages: [],
  pendingText: '',

  openChat: (ctx) => {
    set({
      isOpen: true,
      context: ctx,
      messages: [{ role: 'ai', content: INITIAL_AI_MESSAGE }],
      pendingText: '',
    })
  },

  closeChat: () => set({ isOpen: false, context: null, messages: [], pendingText: '' }),

  setPendingText: (text) => set({ pendingText: text }),

  sendMessage: () => {
    const { pendingText, messages } = get()
    if (!pendingText.trim()) return
    set({
      messages: [
        ...messages,
        { role: 'user', content: pendingText },
        { role: 'ai', content: AI_REPLY },
      ],
      pendingText: '',
    })
  },

  confirmReflection: () => {
    const { messages } = get()
    const userMessages = messages.filter((m) => m.role === 'user').map((m) => m.content)
    return userMessages.length > 0 ? userMessages.join('\n') : '(AI 분석 내용 반영)'
  },
}))
