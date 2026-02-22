import { observer } from 'mobx-react-lite'
import { Navigate } from 'react-router-dom'
import { useStore } from '../../hooks/useStore'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute = observer(({ children }: ProtectedRouteProps) => {
  const { auth } = useStore()

  // Show loading while checking auth
  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
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
