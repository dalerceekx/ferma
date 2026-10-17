import { useEffect, useRef, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { currentUser, ROLE_LABEL } from './logic'
import { useFarm } from './store'
import Dashboard from './pages/Dashboard'
import Animals from './pages/Animals'
import Groups from './pages/Groups'
import Warehouse from './pages/Warehouse'
import Calculator from './pages/Calculator'
import Expenses from './pages/Expenses'
import Reports from './pages/Reports'
import Profile from './pages/Profile'
import Admin from './pages/Admin'

const NAV = [
  { to: '/', label: 'Bosh sahifa', icon: '⌂' },
  { to: '/hayvonlar', label: 'Hayvonlar', icon: '◉' },
  { to: '/guruhlar', label: 'Guruhlar', icon: '▦' },
  { to: '/ombor', label: 'Ombor', icon: '▤' },
  { to: '/hisoblagich', label: 'Yem hisoblagich', icon: '∑' },
  { to: '/xarajatlar', label: 'Xarajatlar', icon: '¤' },
  { to: '/hisobot', label: 'Hisobot', icon: '▥' },
]

function ProfileMenu() {
  const { state, run } = useFarm()
  const me = currentUser(state)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  const initials = me.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
  return (
    <div className="profile" ref={ref}>
      <button className="profile-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="avatar">{initials}</span>
        <span className="profile-text">
          <b>{me.name}</b>
          <small>{ROLE_LABEL[me.role]}</small>
        </span>
      </button>
      {open && (
        <div className="profile-menu">
          <div className="menu-label">Foydalanuvchini almashtirish</div>
          {state.users.map((u) => (
            <button
              key={u.id}
              className={'menu-item' + (u.id === me.id ? ' active' : '')}
              onClick={() => {
                run((s) => ({ ...s, currentUserId: u.id }), `${u.name} (${ROLE_LABEL[u.role]}) sifatida kirildi`)
                setOpen(false)
              }}
            >
              {u.name} <small>{ROLE_LABEL[u.role]}</small>
            </button>
          ))}
          <hr />
          <NavLink className="menu-item" to="/profil" onClick={() => setOpen(false)}>
            Profil va sozlamalar
          </NavLink>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const { state, toasts, saveError } = useFarm()
  const me = currentUser(state)
  const [menuOpen, setMenuOpen] = useState(false)
  const loc = useLocation()
  useEffect(() => setMenuOpen(false), [loc.pathname])

  return (
    <div className="layout">
      <aside className={'sidebar' + (menuOpen ? ' open' : '')}>
        <div className="brand">
          <span className="logo">⌂</span>
          <div>
            <b>{state.farmName}</b>
            <small>Ferma boshqaruvi</small>
          </div>
        </div>
        <nav>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className="nav-link">
              <span className="nav-icon">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
          {me.role === 'admin' && (
            <NavLink to="/admin" className="nav-link">
              <span className="nav-icon">⚙</span>
              Admin panel
            </NavLink>
          )}
        </nav>
        <div className="sidebar-foot">Demo versiya · ma’lumotlar shu brauzerda saqlanadi</div>
      </aside>
      {menuOpen && <div className="sidebar-shade" onClick={() => setMenuOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <button className="icon-btn burger" onClick={() => setMenuOpen((o) => !o)} aria-label="Menyu">
            ☰
          </button>
          <span className="demo-badge">Demo rejim</span>
          <div className="spacer" />
          <ProfileMenu />
        </header>
        {saveError && (
          <div className="alert error">
            Ma’lumotlarni brauzerga saqlab bo‘lmadi (xotira to‘lgan yoki bloklangan). Profil sahifasidan zaxira nusxa oling.
          </div>
        )}
        <main className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/hayvonlar" element={<Animals />} />
            <Route path="/guruhlar" element={<Groups />} />
            <Route path="/ombor" element={<Warehouse />} />
            <Route path="/hisoblagich" element={<Calculator />} />
            <Route path="/xarajatlar" element={<Expenses />} />
            <Route path="/hisobot" element={<Reports />} />
            <Route path="/profil" element={<Profile key={me.id} />} />
            <Route path="/admin" element={me.role === 'admin' ? <Admin /> : <Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={'toast ' + t.kind}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  )
}
