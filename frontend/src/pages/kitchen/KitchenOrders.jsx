import { useState, useEffect } from 'react'
import { getPanelOrders, updateOrderItemStatus } from '../../api'
import { useAuth } from '../../AuthContext'
import toast from 'react-hot-toast'

const PANEL_NAMES = {
  shashlik: '🔥 Панель шашлыка',
  samsa: '🥟 Панель самсы',
  national: '🍲 Национальные блюда',
  dessert: '🍰 Десерты',
}

const STATUS_FLOW = {
  pending: { next: 'preparing', label: '👨‍🍳 Начать готовить', color: '#f59e0b' },
  preparing: { next: 'ready', label: '✅ Готово', color: '#3b82f6' },
  ready: { next: null, label: 'Готов к подаче', color: '#22c55e' },
}

export default function KitchenOrders() {
  const { user } = useAuth()
  const panelType = user?.role
  const [items, setItems] = useState([])
  const [statusFilter, setStatusFilter] = useState('pending')

  const load = () => {
    if (!panelType) return
    getPanelOrders(panelType, statusFilter).then((res) => setItems(res.data))
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [panelType, statusFilter])

  const handleStatusChange = async (itemId, newStatus) => {
    try {
      await updateOrderItemStatus(itemId, newStatus)
      toast.success('Статус обновлён')
      load()
    } catch (err) {
      toast.error('Ошибка обновления')
    }
  }

  const formatPrice = (p) => new Intl.NumberFormat('uz-UZ').format(p) + ' сум'

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{PANEL_NAMES[panelType] || 'Кухня'}</h1>
        <button className="btn btn-outline" onClick={load}>🔄 Обновить</button>
      </div>

      <div className="filter-bar">
        <button className={`filter-btn ${statusFilter === 'pending' ? 'active' : ''}`} onClick={() => setStatusFilter('pending')}>
          ⏳ Ожидают ({items.filter ? items.length : 0})
        </button>
        <button className={`filter-btn ${statusFilter === 'preparing' ? 'active' : ''}`} onClick={() => setStatusFilter('preparing')}>
          👨‍🍳 Готовятся
        </button>
        <button className={`filter-btn ${statusFilter === 'ready' ? 'active' : ''}`} onClick={() => setStatusFilter('ready')}>
          ✅ Готовы
        </button>
        <button className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>
          Все
        </button>
      </div>

      <div className="kitchen-grid">
        {items.map((item) => (
          <div key={item.id} className={`kitchen-card status-${item.status}`}>
            <div className="kitchen-card-header">
              <span className="table-badge">🪑 Стол №{item.table_number}</span>
              <span className="order-badge">Заказ #{item.order_id}</span>
            </div>
            <div className="kitchen-card-body">
              <h3>{item.menu_item_name}</h3>
              <div className="kitchen-meta">
                <span className="kitchen-qty">Количество: <strong>{item.quantity}</strong></span>
                <span className="kitchen-price">{formatPrice(item.price)}</span>
              </div>
              <span className="kitchen-waiter">Официант: {item.waiter_name}</span>
              <span className="kitchen-time">
                {new Date(item.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="kitchen-card-footer">
              {STATUS_FLOW[item.status]?.next && (
                <button
                  className="btn btn-primary btn-full"
                  onClick={() => handleStatusChange(item.id, STATUS_FLOW[item.status].next)}
                >
                  {STATUS_FLOW[item.status].label}
                </button>
              )}
              {!STATUS_FLOW[item.status]?.next && (
                <span className="ready-badge">✅ Готово к подаче</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="empty-state">
          <p>Нет заказов с данным статусом</p>
        </div>
      )}
    </div>
  )
}
