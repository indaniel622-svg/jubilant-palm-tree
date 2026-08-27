import { useStore } from '../store/appStore'
import MessageList from './MessageList'
import MessageInput from './MessageInput'

function ChatContainer() {
  const { messages, isLoading } = useStore()

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-dark-bg">
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="text-6xl mb-4">🤖</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Bienvenido a Apex AI</h2>
          <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-8">
            Comienza una conversación escribiendo un mensaje o usa el botón de micrófono para hablar.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
            {[
              { icon: '💬', title: 'Chat', desc: 'Conversa naturalmente' },
              { icon: '🎙️', title: 'Voz', desc: 'Modo hands-free' },
              { icon: '📊', title: 'Análisis', desc: 'Datos inteligentes' },
            ].map((feature, i) => (
              <div key={i} className="p-4 rounded-lg bg-gray-50 dark:bg-dark-surface text-center">
                <div className="text-3xl mb-2">{feature.icon}</div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{feature.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <MessageList messages={messages} />
          {isLoading && (
            <div className="px-6 py-4 flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span>Procesando...</span>
            </div>
          )}
        </>
      )}
      <MessageInput />
    </div>
  )
}

export default ChatContainer
