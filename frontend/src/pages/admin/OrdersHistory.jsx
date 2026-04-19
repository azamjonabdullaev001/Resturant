import { useState, useEffect } from 'react'
import { getOrders, getOrder, markOrderPaid, cancelOrder } from '../../api'
import toast from 'react-hot-toast'

const STATUS_LABELS = {
  pending: 'Ожидает',
  preparing: 'Готовится',
  ready: 'Готов',
  served: 'Подан',
  paid: 'Оплачен',
  cancelled: 'Отменён',
}

const STATUS_COLORS = {
  pending: '#f59e0b',
  preparing: '#3b82f6',
  ready: '#22c55e',
  served: '#8b5cf6',
  paid: '#6b7280',
  cancelled: '#ef4444',
}

export default function OrdersHistory() {
  const [orders, setOrders] = useState([])
  const [selected, setSelected] = useState(null)
  const [filterPaid, setFilterPaid] = useState('false')

  const load = () => {
    const params = {}
    if (filterPaid !== 'all') params.paid = filterPaid
    getOrders(params).then((res) => setOrders(res.data))
  }
  useEffect(() => { load() }, [filterPaid])

  const handleView = async (id) => {
    const res = await getOrder(id)
    setSelected(res.data)
  }

  const handlePay = async (id) => {
    try {
      await markOrderPaid(id)
      toast.success('Заказ оплачен')
      setSelected(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка')
    }
  }

  const handleCancel = async (id) => {
    if (!confirm('Отменить заказ?')) return
    try {
      await cancelOrder(id)
      toast.success('Заказ отменён')
      setSelected(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка')
    }
  }

  const formatPrice = (price) => new Intl.NumberFormat('uz-UZ').format(price) + ' сум'
  const formatDate = (d) => new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="page">
      <h1 className="page-title">Заказы</h1>

      <div className="filter-bar">
        <button className={`filter-btn ${filterPaid === 'false' ? 'active' : ''}`} onClick={() => setFilterPaid('false')}>⚠️ Неоплаченные</button>
        <button className={`filter-btn ${filterPaid === 'true' ? 'active' : ''}`} onClick={() => setFilterPaid('true')}>✅ Оплаченные</button>
        <button className={`filter-btn ${filterPaid === 'all' ? 'active' : ''}`} onClick={() => setFilterPaid('all')}>Все</button>
      </div>

      {selected && (
        <div className="card order-detail">
          <div className="page-header">
            <h2>Заказ #{selected.id}</h2>
            <button className="btn btn-sm btn-outline" onClick={() => setSelected(null)}>✕ Закрыть</button>
          </div>
          <div className="order-info">
            <span>🪑 Стол №{selected.table_number}</span>
            <span>👤 {selected.waiter_name}</span>
            <span style={{ color: STATUS_COLORS[selected.status] }}>● {STATUS_LABELS[selected.status]}</span>
            <span>🕐 {formatDate(selected.created_at)}</span>
          </div>
          <table>
            <thead>
              <tr><th>Блюдо</th><th>Панель</th><th>Кол-во</th><th>Цена</th><th>Статус</th></tr>
            </thead>
            <tbody>
              {selected.items?.map((item) => (
                <tr key={item.id}>
                  <td>{item.menu_item_name}</td>
                  <td><span className={`badge badge-${item.panel_type}`}>{item.panel_type}</span></td>
                  <td>{item.quantity}</td>
                  <td>{formatPrice(item.price)}</td>
                  <td style={{ color: STATUS_COLORS[item.status] }}>{STATUS_LABELS[item.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="order-total">
            <strong>Итого: {formatPrice(selected.total_price)}</strong>
          </div>
          {!selected.paid && selected.status !== 'cancelled' && (
            <div className="btn-group" style={{ marginTop: '1rem' }}>
              <button className="btn btn-primary" onClick={() => handlePay(selected.id)}>💵 Оплатить</button>
              <button className="btn btn-danger" onClick={() => handleCancel(selected.id)}>❌ Отменить</button>
            </div>
          )}
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Стол</th>
              <th>Официант</th>
              <th>Сумма</th>
              <th>Статус</th>
              <th>Оплата</th>
              <th>Дата</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className={!o.paid && o.status !== 'cancelled' ? 'row-highlight' : ''}>
                <td>{o.id}</td>
                <td>№{o.table_number}</td>
                <td>{o.waiter_name}</td>
                <td><strong>{formatPrice(o.total_price)}</strong></td>
                <td><span style={{ color: STATUS_COLORS[o.status] }}>● {STATUS_LABELS[o.status]}</span></td>
                <td>{o.paid ? '✅' : '⚠️'}</td>
                <td>{formatDate(o.created_at)}</td>
                <td>
                  <div className="btn-group">
                    <button className="btn btn-sm btn-outline" onClick={() => handleView(o.id)}>👁️</button>
                    {!o.paid && o.status !== 'cancelled' && (
                      <button className="btn btn-sm btn-primary" onClick={() => handlePay(o.id)}>💵</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {orders.length === 0 && <p className="empty-state">Заказов нет</p>}
    </div>
  )
}
