import { useState } from 'react'
import { useStore } from '../store/appStore'
import { generateResponse } from '../services/geminiService'

function MessageInput() {
  const [input, setInput] = useState('')
  const { messages, addMessage, setIsLoading, isLoading } = useStore()

  const handleSendMessage = async () => {
    if (!input.trim()) return

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: input,
      timestamp: Date.now(),
    }

    addMessage(userMessage)
    setInput('')
    setIsLoading(true)

    try {
      const response = await generateResponse({
        prompt: input,
        conversationHistory: messages.map((msg) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          content: msg.content,
        })),
      })

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: response,
        timestamp: Date.now(),
      }

      addMessage(assistantMessage)
    } catch (error) {
      console.error('Error:', error)
      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Disculpa, hubo un error procesando tu mensaje. Intenta de nuevo.',
        timestamp: Date.now(),
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="border-t border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface p-4">
      <div className="flex gap-2 max-w-4xl mx-auto">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
          placeholder="Escribe un mensaje..."
          disabled={isLoading}
          className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSendMessage}
          disabled={isLoading || !input.trim()}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Enviar
        </button>
      </div>
    </div>
  )
}

export default MessageInput
