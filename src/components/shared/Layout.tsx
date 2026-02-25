import { observer } from 'mobx-react-lite'
import { Outlet, Link } from 'react-router-dom'
import { useStore } from '../../hooks/useStore'
import Calculator from './Calculator'

const Layout = observer(() => {
  const { auth } = useStore()

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          {/* App Name - Left */}
          <Link to="/dashboard" className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-primary">TripLedger</h1>
          </Link>

          {/* User Info - Right */}
          {auth.currentUser && (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">{auth.currentUser.displayName}</p>
                <p className="text-xs text-muted-foreground">{auth.currentUser.email}</p>
              </div>
              {auth.currentUser.avatarUrl ? (
                <img
                  src={auth.currentUser.avatarUrl}
                  alt={auth.currentUser.displayName}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                  {auth.currentUser.displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Page Content */}
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Floating Calculator */}
      <Calculator />
    </div>
  )
})

export default Layout
