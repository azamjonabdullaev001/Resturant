import { useState, useEffect, useRef } from 'react'
import { getMenu, getCategories, createMenuItem, updateMenuItem, deleteMenuItem, uploadImage } from '../../api'
import toast from 'react-hot-toast'

const API_URL = import.meta.env.VITE_API_URL || ''

export default function ManageMenu() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [filter, setFilter] = useState('')
  const [form, setForm] = useState({ category_id: '', name: '', description: '', price: '', quantity: '', image_url: '' })
  const fileRef = useRef(null)

  const load = () => {
    getMenu().then((res) => setItems(res.data))
    getCategories().then((res) => setCategories(res.data))
  }
  useEffect(() => { load() }, [])

  const filtered = filter ? items.filter((i) => i.panel_type === filter) : items

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const res = await uploadImage(file)
      setForm({ ...form, image_url: res.data.url })
      toast.success('Фото загружено')
    } catch (err) {
      toast.error('Ошибка загрузки фото')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const data = {
        ...form,
        category_id: parseInt(form.category_id),
        price: parseFloat(form.price),
        quantity: parseInt(form.quantity) || 0,
      }
      if (editId) {
        await updateMenuItem(editId, data)
        toast.success('Блюдо обновлено')
      } else {
        await createMenuItem(data)
        toast.success('Блюдо добавлено')
      }
      resetForm()
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка')
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditId(null)
    setForm({ category_id: '', name: '', description: '', price: '', quantity: '', image_url: '' })
  }

  const handleEdit = (item) => {
    setEditId(item.id)
    setForm({
      category_id: item.category_id,
      name: item.name,
      description: item.description,
      price: item.price,
      quantity: item.quantity,
      image_url: item.image_url,
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить блюдо?')) return
    try {
      await deleteMenuItem(id)
      toast.success('Удалено')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка')
    }
  }

  const toggleAvailable = async (item) => {
    await updateMenuItem(item.id, { available: !item.available })
    load()
  }

  const formatPrice = (price) => new Intl.NumberFormat('uz-UZ').format(price) + ' сум'

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Меню</h1>
        <button className="btn btn-primary" onClick={() => { showForm ? resetForm() : setShowForm(true) }}>
          {showForm ? 'Отмена' : '+ Добавить блюдо'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card form-card">
          <div className="form-row">
            <div className="form-group">
              <label>Категория</label>
              <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} required>
                <option value="">Выберите...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.panel_type})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Название</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Цена (сум)</label>
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} min="0" step="100" required />
            </div>
            <div className="form-group">
              <label>Количество</label>
              <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} min="0" />
            </div>
          </div>
          <div className="form-group">
            <label>Описание</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="form-group">
            <label>Фото</label>
            <input type="file" ref={fileRef} accept="image/*" onChange={handleImageUpload} />
            {form.image_url && <img src={API_URL + form.image_url} alt="" className="preview-img" />}
          </div>
          <button type="submit" className="btn btn-primary">{editId ? 'Сохранить' : 'Добавить'}</button>
        </form>
      )}

      <div className="filter-bar">
        <button className={`filter-btn ${filter === '' ? 'active' : ''}`} onClick={() => setFilter('')}>Все</button>
        {['shashlik', 'samsa', 'national', 'dessert', 'drinks'].map((t) => (
          <button key={t} className={`filter-btn ${filter === t ? 'active' : ''}`} onClick={() => setFilter(t)}>
            {{shashlik:'Шашлык',samsa:'Самса',national:'Нац. блюда',dessert:'Десерты',drinks:'Напитки'}[t]}
          </button>
        ))}
      </div>

      <div className="menu-grid">
        {filtered.map((item) => (
          <div key={item.id} className={`menu-card ${!item.available ? 'unavailable' : ''}`}>
            {item.image_url && (
              <div className="menu-card-img">
                <img src={API_URL + item.image_url} alt={item.name} />
              </div>
            )}
            <div className="menu-card-body">
              <h3>{item.name}</h3>
              <span className={`badge badge-${item.panel_type}`}>{item.category_name}</span>
              {item.description && <p className="menu-desc">{item.description}</p>}
              <div className="menu-meta">
                <span className="menu-price">{formatPrice(item.price)}</span>
                <span className="menu-qty">Осталось: {item.quantity}</span>
              </div>
              <div className="btn-group" style={{ marginTop: '0.5rem' }}>
                <button className="btn btn-sm btn-outline" onClick={() => toggleAvailable(item)}>
                  {item.available ? '🟢' : '🔴'}
                </button>
                <button className="btn btn-sm btn-outline" onClick={() => handleEdit(item)}>✏️</button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}>🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && <p className="empty-state">Блюда не найдены</p>}
    </div>
  )
}
