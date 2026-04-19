import { useState, useEffect } from 'react'
import { getDashboard } from '../../api'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    getDashboard().then((res) => setStats(res.data))
  }, [])

  if (!stats) return <div className="loading">Загрузка...</div>

  const cards = [
    { label: 'Всего заказов', value: stats.total_orders, icon: '📋', color: '#4f46e5' },
    { label: 'Неоплаченные', value: stats.unpaid_orders, icon: '⚠️', color: '#dc2626' },
    { label: 'Выручка сегодня', value: formatPrice(stats.today_revenue), icon: '💰', color: '#16a34a' },
    { label: 'Общая выручка', value: formatPrice(stats.total_revenue), icon: '💎', color: '#7c3aed' },
    { label: 'Занятые столы', value: `${stats.active_tables}/${stats.total_tables}`, icon: '🪑', color: '#ea580c' },
    { label: 'Блюда в меню', value: stats.total_menu_items, icon: '🍽️', color: '#0891b2' },
    { label: 'Сотрудники', value: stats.total_users, icon: '👥', color: '#be185d' },
  ]

  return (
    <div className="page">
      <h1 className="page-title">Дашборд</h1>
      <div className="stats-grid">
        {cards.map((card) => (
          <div key={card.label} className="stat-card" style={{ borderLeftColor: card.color }}>
            <div className="stat-icon">{card.icon}</div>
            <div className="stat-info">
              <span className="stat-value">{card.value}</span>
              <span className="stat-label">{card.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatPrice(price) {
  return new Intl.NumberFormat('uz-UZ').format(price) + ' сум'
}
