import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useMe } from '../lib/data'
import { Avatar } from './ui'
import { InboxBell } from './InboxBell'
import { wyndbase } from '../wyndbase'

export function Layout() {
  const { me, isHr, isHrAdmin } = useMe()
  const navigate = useNavigate()
  const pending = useQuery(wyndbase.query.pto.listRequests({ toDecide: true, status: 'pending' }))
  const toDecide = pending.data?.length ?? 0

  const items: { to: string; label: string; icon: string; show: boolean; badge?: number }[] = [
    { to: '/', label: 'Home', icon: '⌂', show: true },
    { to: '/time-off', label: 'My Time Off', icon: '☀', show: true },
    { to: '/approvals', label: 'Approvals', icon: '✓', show: true, badge: toDecide },
    { to: '/people', label: 'People', icon: '☺', show: true },
    { to: '/org', label: 'Org Chart', icon: '⌘', show: true },
    { to: '/hire', label: 'New Hire', icon: '+', show: isHrAdmin },
    { to: '/pto-admin', label: 'Time Off Settings', icon: '⚙', show: isHr },
    { to: '/reports', label: 'Reports', icon: '▤', show: true },
    { to: '/audit', label: 'Audit & GDPR', icon: '⛨', show: isHrAdmin },
  ]

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="logo">W</span> WynHR
        </div>
        <nav>
          {items
            .filter((i) => i.show)
            .map((i) => (
              <NavLink key={i.to} to={i.to} end={i.to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <span className="nav-icon">{i.icon}</span>
                <span>{i.label}</span>
                {!!i.badge && <span className="badge">{i.badge}</span>}
              </NavLink>
            ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="search-hint" onClick={() => navigate('/people')}>
            Search people…
          </div>
          <div className="topbar-right">
            <InboxBell />
            {me?.roles?.filter((r) => r.startsWith('hr_')).map((r) => (
              <span key={r} className="role-chip">
                {r === 'hr_admin' ? 'HR Admin' : 'HR Manager'}
              </span>
            ))}
            <button className="me-btn" onClick={() => me?.employeeId && navigate(`/people/${me.employeeId}`)}>
              <Avatar name={me?.name} size={32} />
              <span>{me?.name ?? '…'}</span>
            </button>
            <button className="btn ghost sm" onClick={() => wyndbase.auth.logout({ scope: 'app' }).then(() => navigate('/login'))}>
              Sign out
            </button>
          </div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
