import { useStore } from '../store/appStore'

function Header() {
  const { isDarkMode } = useStore()

  return (
    <header className="border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">🤖</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Apex AI Studio</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Asistente conversacional inteligente</p>
        </div>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {isDarkMode ? '🌙 Modo Oscuro' : '☀️ Modo Claro'}
      </div>
    </header>
  )
}

export default Header
