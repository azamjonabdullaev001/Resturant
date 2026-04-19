import { useState, useEffect } from 'react'
import { getMyOrders, getOrder } from '../../api'

const STATUS_LABELS = {
  pending: 'Ожидает',
  preparing: 'Готовится',
  ready: '✅ Готов!',
  served: 'Подан',
}

const STATUS_COLORS = {
  pending: '#f59e0b',
  preparing: '#3b82f6',
  ready: '#22c55e',
  served: '#8b5cf6',
}

export default function WaiterDashboard() {
  const [orders, setOrders] = useState([])
  const [selected, setSelected] = useState(null)

  const load = () => getMyOrders().then((res) => setOrders(res.data))
  useEffect(() => {
    load()
    const interval = setInterval(load, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleView = async (id) => {
    const res = await getOrder(id)
    setSelected(res.data)
  }

  const formatPrice = (price) => new Intl.NumberFormat('uz-UZ').format(price) + ' сум'

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Мои активные заказы</h1>
        <button className="btn btn-outline" onClick={load}>🔄 Обновить</button>
      </div>

      {selected && (
        <div className="card order-detail">
          <div className="page-header">
            <h2>Заказ #{selected.id} — Стол №{selected.table_number}</h2>
            <button className="btn btn-sm btn-outline" onClick={() => setSelected(null)}>✕</button>
          </div>
          <table>
            <thead>
              <tr><th>Блюдо</th><th>Кол-во</th><th>Цена</th><th>Статус</th></tr>
            </thead>
            <tbody>
              {selected.items?.map((item) => (
                <tr key={item.id} className={item.status === 'ready' ? 'row-ready' : ''}>
                  <td>{item.menu_item_name}</td>
                  <td>{item.quantity}</td>
                  <td>{formatPrice(item.price)}</td>
                  <td style={{ color: STATUS_COLORS[item.status], fontWeight: 'bold' }}>
                    {STATUS_LABELS[item.status]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="order-total">
            <strong>Итого: {formatPrice(selected.total_price)}</strong>
          </div>
        </div>
      )}

      <div className="orders-grid">
        {orders.map((o) => (
          <div key={o.id} className={`order-card status-${o.status}`} onClick={() => handleView(o.id)}>
            <div className="order-card-header">
              <span className="order-id">Заказ #{o.id}</span>
              <span className="table-badge">Стол №{o.table_number}</span>
            </div>
            <div className="order-card-body">
              <span className="order-price">{formatPrice(o.total_price)}</span>
              <span className="order-status" style={{ color: STATUS_COLORS[o.status] }}>
                {STATUS_LABELS[o.status]}
              </span>
            </div>
          </div>
        ))}
      </div>

      {orders.length === 0 && (
        <div className="empty-state">
          <p>Нет активных заказов</p>
          <a href="/waiter/new-order" className="btn btn-primary">➕ Создать заказ</a>
        </div>
      )}
    </div>
  )
}
