import { observer } from 'mobx-react-lite'
import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useStore } from '../../hooks/useStore'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute = observer(({ children }: ProtectedRouteProps) => {
  const { auth } = useStore()

  // Show loading while checking auth
  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 size={28} className="animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!auth.isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  // Render children if authenticated
  return <>{children}</>
})

export default ProtectedRoute
