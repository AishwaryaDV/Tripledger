import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/shared/Layout'
import ProtectedRoute from './components/shared/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import TripDetail from './pages/TripDetail'
import AddExpense from './pages/AddExpense'
import Settle from './pages/Settle'
import CreateTrip from './pages/CreateTrip'
import Login from './pages/Login'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes with Layout */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/trips/new" element={<CreateTrip />} />
          <Route path="/trips/:id" element={<TripDetail />} />
          <Route path="/trips/:id/add" element={<AddExpense />} />
          <Route path="/trips/:id/settle" element={<Settle />} />
        </Route>

        {/* Catch-all redirect to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
