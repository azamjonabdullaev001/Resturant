import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTables, getMenu, createOrder } from '../../api'
import toast from 'react-hot-toast'

const API_URL = import.meta.env.VITE_API_URL || ''

const PANEL_LABELS = {
  shashlik: '🔥 Шашлык',
  samsa: '🥟 Самса',
  national: '🍲 Нац. блюда',
  dessert: '🍰 Десерты',
  drinks: '🥤 Напитки',
}

export default function TakeOrder() {
  const [tables, setTables] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [selectedTable, setSelectedTable] = useState(null)
  const [cart, setCart] = useState([])
  const [activePanel, setActivePanel] = useState('shashlik')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    getTables().then((res) => setTables(res.data))
    getMenu({ available: 'true' }).then((res) => setMenuItems(res.data))
  }, [])

  const panelItems = menuItems.filter((i) => i.panel_type === activePanel)

  const addToCart = (item) => {
    const existing = cart.find((c) => c.menu_item_id === item.id)
    if (existing) {
      if (existing.quantity >= item.quantity) {
        toast.error('Недостаточно на складе')
        return
      }
      setCart(cart.map((c) => c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c))
    } else {
      setCart([...cart, {
        menu_item_id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        max_qty: item.quantity,
        panel_type: item.panel_type,
      }])
    }
  }

  const updateCartQty = (menuItemId, delta) => {
    setCart(cart.map((c) => {
      if (c.menu_item_id !== menuItemId) return c
      const newQty = c.quantity + delta
      if (newQty <= 0) return null
      if (newQty > c.max_qty) { toast.error('Недостаточно'); return c }
      return { ...c, quantity: newQty }
    }).filter(Boolean))
  }

  const removeFromCart = (menuItemId) => {
    setCart(cart.filter((c) => c.menu_item_id !== menuItemId))
  }

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0)
  const formatPrice = (price) => new Intl.NumberFormat('uz-UZ').format(price) + ' сум'

  const handleSubmit = async () => {
    if (!selectedTable) { toast.error('Выберите стол'); return }
    if (cart.length === 0) { toast.error('Корзина пуста'); return }
    setSubmitting(true)
    try {
      await createOrder({
        table_id: selectedTable.id,
        items: cart.map((c) => ({ menu_item_id: c.menu_item_id, quantity: c.quantity })),
      })
      toast.success('Заказ отправлен!')
      navigate('/waiter')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка создания заказа')
    } finally {
      setSubmitting(false)
    }
  }

  // Step 1: Select table
  if (!selectedTable) {
    return (
      <div className="page">
        <h1 className="page-title">Выберите стол</h1>
        <div className="tables-grid">
          {tables.map((t) => (
            <div
              key={t.id}
              className={`table-card selectable ${t.status}`}
              onClick={() => setSelectedTable(t)}
            >
              <div className="table-number">Стол №{t.table_number}</div>
              <div className={`table-status ${t.status}`}>
                {t.status === 'free' ? '✅ Свободен' : '🔴 Занят'}
              </div>
            </div>
          ))}
        </div>
        {tables.length === 0 && <p className="empty-state">Столы не найдены</p>}
      </div>
    )
  }

  // Step 2: Browse menu and build cart
  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Заказ — Стол №{selectedTable.table_number}</h1>
        <button className="btn btn-outline" onClick={() => { setSelectedTable(null); setCart([]) }}>
          ← Другой стол
        </button>
      </div>

      <div className="order-layout">
        {/* Menu section */}
        <div className="menu-section">
          <div className="filter-bar">
            {Object.entries(PANEL_LABELS).map(([key, label]) => (
              <button
                key={key}
                className={`filter-btn ${activePanel === key ? 'active' : ''}`}
                onClick={() => setActivePanel(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="menu-grid compact">
            {panelItems.map((item) => (
              <div key={item.id} className="menu-card compact" onClick={() => addToCart(item)}>
                {item.image_url && (
                  <div className="menu-card-img small">
                    <img src={API_URL + item.image_url} alt={item.name} />
                  </div>
                )}
                <div className="menu-card-body">
                  <h4>{item.name}</h4>
                  <span className="menu-category-tag">{item.category_name}</span>
                  {item.description && <p className="menu-desc small">{item.description}</p>}
                  <div className="menu-meta">
                    <span className="menu-price">{formatPrice(item.price)}</span>
                    <span className="menu-qty">×{item.quantity}</span>
                  </div>
                </div>
                <button className="add-btn">+</button>
              </div>
            ))}
            {panelItems.length === 0 && <p className="empty-state">Нет доступных блюд</p>}
          </div>
        </div>

        {/* Cart section */}
        <div className="cart-section">
          <h2>🛒 Корзина</h2>
          {cart.length === 0 ? (
            <p className="empty-cart">Пусто. Нажмите на блюдо, чтобы добавить.</p>
          ) : (
            <>
              <div className="cart-items">
                {cart.map((c) => (
                  <div key={c.menu_item_id} className="cart-item">
                    <div className="cart-item-info">
                      <span className="cart-item-name">{c.name}</span>
                      <span className="cart-item-price">{formatPrice(c.price)} × {c.quantity}</span>
                    </div>
                    <div className="cart-item-controls">
                      <button className="qty-btn" onClick={() => updateCartQty(c.menu_item_id, -1)}>−</button>
                      <span className="qty-value">{c.quantity}</span>
                      <button className="qty-btn" onClick={() => updateCartQty(c.menu_item_id, 1)}>+</button>
                      <button className="remove-btn" onClick={() => removeFromCart(c.menu_item_id)}>✕</button>
                    </div>
                    <div className="cart-item-total">{formatPrice(c.price * c.quantity)}</div>
                  </div>
                ))}
              </div>
              <div className="cart-total">
                <strong>Итого: {formatPrice(cartTotal)}</strong>
              </div>
              <button
                className="btn btn-primary btn-full"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Отправка...' : '📤 Заказать'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
