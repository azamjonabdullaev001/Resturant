import { useState, useEffect } from 'react'
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../api'
import toast from 'react-hot-toast'

const PANEL_TYPES = [
  { value: 'shashlik', label: 'Шашлык' },
  { value: 'samsa', label: 'Самса' },
  { value: 'national', label: 'Национальные блюда' },
  { value: 'dessert', label: 'Десерты' },
  { value: 'drinks', label: 'Напитки' },
]

const PANEL_LABELS = {
  shashlik: 'Шашлык',
  samsa: 'Самса',
  national: 'Нац. блюда',
  dessert: 'Десерты',
  drinks: 'Напитки',
}

export default function ManageCategories() {
  const [categories, setCategories] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', panel_type: 'shashlik', description: '' })
  const [editId, setEditId] = useState(null)
  const [filter, setFilter] = useState('')

  const load = () => getCategories().then((res) => setCategories(res.data))
  useEffect(() => { load() }, [])

  const filtered = filter ? categories.filter((c) => c.panel_type === filter) : categories

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editId) {
        await updateCategory(editId, { name: form.name, description: form.description })
        toast.success('Категория обновлена')
      } else {
        await createCategory(form)
        toast.success('Категория создана')
      }
      setShowForm(false)
      setEditId(null)
      setForm({ name: '', panel_type: 'shashlik', description: '' })
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка')
    }
  }

  const handleEdit = (cat) => {
    setEditId(cat.id)
    setForm({ name: cat.name, panel_type: cat.panel_type, description: cat.description })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить категорию? Все блюда в ней будут удалены.')) return
    try {
      await deleteCategory(id)
      toast.success('Удалена')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка')
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Категории</h1>
        <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ name: '', panel_type: 'shashlik', description: '' }) }}>
          {showForm ? 'Отмена' : '+ Добавить'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card form-card">
          <div className="form-row">
            <div className="form-group">
              <label>Название</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            {!editId && (
              <div className="form-group">
                <label>Тип панели</label>
                <select value={form.panel_type} onChange={(e) => setForm({ ...form, panel_type: e.target.value })}>
                  {PANEL_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Описание</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <button type="submit" className="btn btn-primary">{editId ? 'Сохранить' : 'Создать'}</button>
        </form>
      )}

      <div className="filter-bar">
        <button className={`filter-btn ${filter === '' ? 'active' : ''}`} onClick={() => setFilter('')}>Все</button>
        {PANEL_TYPES.map((p) => (
          <button key={p.value} className={`filter-btn ${filter === p.value ? 'active' : ''}`} onClick={() => setFilter(p.value)}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Название</th>
              <th>Панель</th>
              <th>Описание</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((cat) => (
              <tr key={cat.id}>
                <td><strong>{cat.name}</strong></td>
                <td><span className={`badge badge-${cat.panel_type}`}>{PANEL_LABELS[cat.panel_type]}</span></td>
                <td>{cat.description || '—'}</td>
                <td>
                  <div className="btn-group">
                    <button className="btn btn-sm btn-outline" onClick={() => handleEdit(cat)}>✏️</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(cat.id)}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
