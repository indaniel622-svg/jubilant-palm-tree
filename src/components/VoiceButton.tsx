import { useState } from 'react'
import { useStore } from '../store/appStore'
import { startListening, isSpeechRecognitionSupported } from '../services/voiceService'
import { generateResponse } from '../services/geminiService'

function VoiceButton() {
  const [isListening, setIsListening] = useState(false)
  const { addMessage, setIsLoading, messages } = useStore()
  const isSupported = isSpeechRecognitionSupported()

  const handleVoiceClick = async () => {
    if (!isSupported) {
      alert('Tu navegador no soporta Speech Recognition')
      return
    }

    setIsListening(true)
    try {
      const text = await startListening()
      if (text) {
        const userMessage = {
          id: Date.now().toString(),
          role: 'user' as const,
          content: text,
          timestamp: Date.now(),
        }
        addMessage(userMessage)
        
        setIsLoading(true)
        try {
          const response = await generateResponse({
            prompt: text,
            conversationHistory: messages.map((msg) => ({
              role: msg.role === 'user' ? 'user' : 'model',
              content: msg.content,
            })),
          })

          addMessage({
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response,
            timestamp: Date.now(),
          })
        } catch (error) {
          console.error('Error:', error)
          addMessage({
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'Disculpa, hubo un error procesando tu mensaje de voz.',
            timestamp: Date.now(),
          })
        } finally {
          setIsLoading(false)
        }
      }
    } catch (error) {
      console.error('Error listening:', error)
    } finally {
      setIsListening(false)
    }
  }

  if (!isSupported) return null

  return (
    <button
      onClick={handleVoiceClick}
      disabled={isListening}
      className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${
        isListening
          ? 'bg-red-500 scale-110 animate-pulse'
          : 'bg-blue-500 hover:bg-blue-600'
      } text-white font-bold text-lg`}
      title="Activar micrófono"
    >
      🎙️
    </button>
  )
}

export default VoiceButton
