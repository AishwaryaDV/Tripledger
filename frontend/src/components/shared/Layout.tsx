import { observer } from 'mobx-react-lite'
import { Outlet, Link } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import Calculator from './Calculator'
import UserMenu from './UserMenu'
import { useTheme } from '@/hooks/useTheme'

const Layout = observer(() => {
  const { theme, toggle } = useTheme()

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      {/* Top Navigation Bar */}
      <header>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* App Name - Left */}
          <Link to="/dashboard" className="flex items-center">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">TripLedger</h1>
          </Link>

          {/* Right: theme toggle + user menu */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus:outline-none"
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-5 sm:py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-4 text-center">
          <span className="text-xs text-foreground/50">TripLedger © {new Date().getFullYear()}</span>
        </div>
      </footer>

      {/* Floating Calculator */}
      <Calculator />
    </div>
  )
})

export default Layout
