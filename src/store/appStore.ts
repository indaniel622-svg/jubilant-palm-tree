import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  voiceUrl?: string
}

interface AppStore {
  isDarkMode: boolean
  setDarkMode: (isDark: boolean) => void

  messages: Message[]
  addMessage: (message: Message) => void
  clearMessages: () => void

  isLoading: boolean
  setIsLoading: (loading: boolean) => void

  isListening: boolean
  setIsListening: (listening: boolean) => void

  currentTheme: 'light' | 'dark' | 'auto'
  setTheme: (theme: 'light' | 'dark' | 'auto') => void
}

export const useStore = create<AppStore>()(persist(
  (set) => ({
    isDarkMode: false,
    setDarkMode: (isDark: boolean) => set({ isDarkMode: isDark }),

    messages: [],
    addMessage: (message: Message) => set((state) => ({ 
      messages: [...state.messages, message] 
    })),
    clearMessages: () => set({ messages: [] }),

    isLoading: false,
    setIsLoading: (loading: boolean) => set({ isLoading: loading }),

    isListening: false,
    setIsListening: (listening: boolean) => set({ isListening: listening }),

    currentTheme: 'auto',
    setTheme: (theme: 'light' | 'dark' | 'auto') => set({ currentTheme: theme }),
  }),
  {
    name: 'apex-ai-store',
  }
))
