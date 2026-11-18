import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Home } from './pages/Home'
import { TimeOff } from './pages/TimeOff'
import { Approvals } from './pages/Approvals'
import { People } from './pages/People'
import { Profile } from './pages/Profile'
import { Hire } from './pages/Hire'
import { Org } from './pages/Org'
import { PtoAdmin } from './pages/PtoAdmin'
import { Reports } from './pages/Reports'
import { Audit } from './pages/Audit'
import { wyndbase } from './wyndbase'

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!wyndbase.auth.isAuthenticated()) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Home />} />
        <Route path="time-off" element={<TimeOff />} />
        <Route path="approvals" element={<Approvals />} />
        <Route path="people" element={<People />} />
        <Route path="people/:id" element={<Profile />} />
        <Route path="hire" element={<Hire />} />
        <Route path="org" element={<Org />} />
        <Route path="pto-admin" element={<PtoAdmin />} />
        <Route path="reports" element={<Reports />} />
        <Route path="audit" element={<Audit />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
