import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/shared/Layout'
import ProtectedRoute from './components/shared/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import TripDetail from './pages/TripDetail'
import AddExpense from './pages/AddExpense'
import Settle from './pages/Settle'
import TripSummary from './pages/TripSummary'
import CreateTrip from './pages/CreateTrip'
import Login from './pages/Login'
import Landing from './pages/Landing'
import About from './pages/About'
import InviteJoin from './pages/InviteJoin'
import Terms from './pages/Terms'
import ResetPassword from './pages/ResetPassword'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/about" element={<About />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/login" element={<Login />} />
        <Route path="/join/:code" element={<InviteJoin />} />

        {/* Protected routes with Layout */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/trips/new" element={<CreateTrip />} />
          <Route path="/trips/:id" element={<TripDetail />} />
          <Route path="/trips/:id/add" element={<AddExpense />} />
          <Route path="/trips/:id/expenses/:expenseId/edit" element={<AddExpense />} />
          <Route path="/trips/:id/settle" element={<Settle />} />
          <Route path="/trips/:id/summary" element={<TripSummary />} />
        </Route>

        {/* Catch-all redirect to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
