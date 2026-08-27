import { useStore } from '../store/appStore'

function ThemeToggle() {
  const { isDarkMode, setDarkMode } = useStore()

  const handleToggle = () => {
    const newMode = !isDarkMode
    setDarkMode(newMode)
    if (newMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <button
      onClick={handleToggle}
      className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold text-lg transition-all"
      title="Cambiar tema"
    >
      {isDarkMode ? '☀️' : '🌙'}
    </button>
  )
}

export default ThemeToggle
