import { observer } from 'mobx-react-lite'
import { Outlet, Link } from 'react-router-dom'
import Calculator from './Calculator'
import UserMenu from './UserMenu'

const Layout = observer(() => {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* App Name - Left */}
          <Link to="/dashboard" className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-primary">TripLedger</h1>
          </Link>

          {/* User Menu - Right */}
          <UserMenu />
        </div>
      </header>

      {/* Page Content */}
      <main className="container mx-auto px-5 py-7 sm:px-4 sm:py-6">
        <Outlet />
      </main>

      {/* Floating Calculator */}
      <Calculator />
    </div>
  )
})

export default Layout
