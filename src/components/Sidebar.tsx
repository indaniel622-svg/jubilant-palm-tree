import { useState } from 'react'
import { useStore } from '../store/appStore'

function Sidebar() {
  const { clearMessages } = useStore()
  const [isOpen, setIsOpen] = useState(true)

  const menuItems = [
    { icon: '💬', label: 'Nueva Conversación', onClick: clearMessages },
    { icon: '📝', label: 'Historial', onClick: () => {} },
    { icon: '⚙️', label: 'Configuración', onClick: () => {} },
    { icon: '❓', label: 'Ayuda', onClick: () => {} },
  ]

  return (
    <aside className={`${isOpen ? 'w-64' : 'w-20'} bg-white dark:bg-dark-surface border-r border-gray-200 dark:border-dark-border transition-all duration-300 flex flex-col`}>
      <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-dark-border">
        {isOpen && <span className="font-bold text-gray-900 dark:text-white">Menú</span>}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition-colors"
        >
          {isOpen ? '◀️' : '▶️'}
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-2">
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={item.onClick}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-bg transition-colors text-gray-700 dark:text-gray-300"
            title={item.label}
          >
            <span className="text-xl">{item.icon}</span>
            {isOpen && <span className="text-sm">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-200 dark:border-dark-border text-xs text-gray-600 dark:text-gray-400 text-center">
        {isOpen && <p>© 2024 Apex AI</p>}
      </div>
    </aside>
  )
}

export default Sidebar
