import { useEffect, useState } from 'react'
import { useStore } from './store/appStore'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import ChatContainer from './components/ChatContainer'
import VoiceButton from './components/VoiceButton'
import ThemeToggle from './components/ThemeToggle'

function App() {
  const { isDarkMode } = useStore()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="flex h-screen bg-white dark:bg-dark-bg">
      <Sidebar />
      
      <div className="flex flex-col flex-1">
        <Header />
        <ChatContainer />
      </div>

      <div className="fixed bottom-6 right-6 flex gap-3">
        <VoiceButton />
        <ThemeToggle />
      </div>
    </div>
  )
}

export default App
