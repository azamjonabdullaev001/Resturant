import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

const PANEL_NAMES = {
  admin: 'Админ-панель',
  waiter: 'Панель официанта',
  shashlik: 'Панель шашлыка',
  samsa: 'Панель самсы',
  national: 'Национальные блюда',
  dessert: 'Десерты и напитки',
}

const ADMIN_LINKS = [
  { to: '/admin', label: '📊 Дашборд', end: true },
  { to: '/admin/orders', label: '📋 Заказы' },
  { to: '/admin/tables', label: '🪑 Столы' },
  { to: '/admin/users', label: '👥 Сотрудники' },
  { to: '/admin/categories', label: '📁 Категории' },
  { to: '/admin/menu', label: '🍽️ Меню' },
]

const WAITER_LINKS = [
  { to: '/waiter', label: '📋 Мои заказы', end: true },
  { to: '/waiter/new-order', label: '➕ Новый заказ' },
]

const KITCHEN_LINKS = (type) => [
  { to: `/kitchen/${type}`, label: '📋 Заказы', end: true },
  { to: `/kitchen/${type}/menu`, label: '🍽️ Мои блюда' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  let links = []
  if (user?.role === 'admin') links = ADMIN_LINKS
  else if (user?.role === 'waiter') links = WAITER_LINKS
  else links = KITCHEN_LINKS(user?.role)

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>🍽️ Ресторан</h2>
          <span className="role-badge">{PANEL_NAMES[user?.role]}</span>
        </div>
        <nav className="sidebar-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-name">{user?.name}</span>
            <span className="user-phone">{user?.phone}</span>
          </div>
          <button onClick={handleLogout} className="btn btn-outline btn-sm" style={{ width: '100%' }}>
            🚪 Выйти
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
