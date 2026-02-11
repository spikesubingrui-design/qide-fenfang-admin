import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { getToken } from './api/auth'
import BasicLayout from './layouts/BasicLayout'
import Login from './pages/Login'
import Members from './pages/Members'
import Reservations from './pages/Reservations'
import Staff from './pages/Staff'
import Stats from './pages/Stats'
import Inventory from './pages/Inventory'
import Salary from './pages/Salary'
import Performance from './pages/Performance'
import Points from './pages/Points'
import Services from './pages/Services'

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!getToken()) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <BasicLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/members" replace />} />
          <Route path="members" element={<Members />} />
          <Route path="reservations" element={<Reservations />} />
          <Route path="staff" element={<Staff />} />
          <Route path="salary" element={<Salary />} />
          <Route path="performance" element={<Performance />} />
          <Route path="points" element={<Points />} />
          <Route path="services" element={<Services />} />
          <Route path="stats" element={<Stats />} />
          <Route path="inventory" element={<Inventory />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
