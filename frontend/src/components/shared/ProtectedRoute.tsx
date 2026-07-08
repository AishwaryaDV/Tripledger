import { observer } from 'mobx-react-lite'
import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useStore } from '../../hooks/useStore'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute = observer(({ children }: ProtectedRouteProps) => {
  const { auth } = useStore()
  const location = useLocation()

  // Show loading while checking auth
  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 size={28} className="animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  // Redirect to login if not authenticated — remember where they were headed
  // so Login can send them back after re-auth (it already honours redirectTo)
  if (!auth.isLoggedIn) {
    return (
      <Navigate
        to="/login"
        state={{ redirectTo: location.pathname + location.search }}
        replace
      />
    )
  }

  // After Google OAuth the user may land at /dashboard while a deep link
  // was saved to sessionStorage — honour it once.
  const pendingRedirect = sessionStorage.getItem('post_login_redirect')
  if (pendingRedirect) {
    sessionStorage.removeItem('post_login_redirect')
    return <Navigate to={pendingRedirect} replace />
  }

  // Render children if authenticated
  return <>{children}</>
})

export default ProtectedRoute
