import { observer } from 'mobx-react-lite'
import { Outlet, Link } from 'react-router-dom'
import Calculator from './Calculator'
import UserMenu from './UserMenu'

const Layout = observer(() => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Navigation Bar */}
      <header>
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* App Name - Left */}
          <Link to="/dashboard" className="flex items-center gap-1">
            <img src="/adv-logo.png" alt="adv logo" className="h-10 w-auto" />
            <h1 className="text-2xl font-bold text-foreground">TripLedger</h1>
          </Link>

          {/* User Menu - Right */}
          <UserMenu />
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1 container mx-auto px-5 py-7 sm:px-4 sm:py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="mt-auto">
        <div className="container mx-auto px-4 py-4 flex items-center justify-center gap-2">
          <img src="/adv-logo.png" alt="adv logo" className="h-5 w-auto opacity-50" />
          <span className="text-xs text-foreground/50">TripLedger © {new Date().getFullYear()}</span>
        </div>
      </footer>

      {/* Floating Calculator */}
      <Calculator />
    </div>
  )
})

export default Layout
