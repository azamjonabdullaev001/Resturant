import { useState, useEffect } from 'react'
import { getUsers, createUser, updateUser, deleteUser } from '../../api'
import toast from 'react-hot-toast'

const ROLES = [
  { value: 'waiter', label: 'Официант' },
  { value: 'shashlik', label: 'Шашлычник' },
  { value: 'samsa', label: 'Самсачик' },
  { value: 'national', label: 'Нац. блюда' },
  { value: 'dessert', label: 'Десерты' },
]

const ROLE_LABELS = {
  admin: 'Администратор',
  waiter: 'Официант',
  shashlik: 'Шашлычник',
  samsa: 'Самсачик',
  national: 'Нац. блюда',
  dessert: 'Десерты',
}

export default function ManageUsers() {
  const [users, setUsers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ phone: '+998', password: '', name: '', role: 'waiter' })
  const [editId, setEditId] = useState(null)

  const load = () => getUsers().then((res) => setUsers(res.data))
  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editId) {
        const data = { name: form.name, phone: form.phone, role: form.role }
        if (form.password) data.password = form.password
        await updateUser(editId, data)
        toast.success('Сотрудник обновлён')
      } else {
        await createUser(form)
        toast.success('Сотрудник добавлен')
      }
      setShowForm(false)
      setEditId(null)
      setForm({ phone: '+998', password: '', name: '', role: 'waiter' })
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка')
    }
  }

  const handleEdit = (user) => {
    setEditId(user.id)
    setForm({ phone: user.phone, password: '', name: user.name, role: user.role })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить сотрудника?')) return
    try {
      await deleteUser(id)
      toast.success('Удалён')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка')
    }
  }

  const toggleActive = async (user) => {
    await updateUser(user.id, { active: !user.active })
    load()
  }

  const handlePhoneChange = (val) => {
    if (!val.startsWith('+998')) val = '+998'
    const suffix = val.slice(4).replace(/\D/g, '')
    setForm({ ...form, phone: '+998' + suffix })
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Сотрудники</h1>
        <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ phone: '+998', password: '', name: '', role: 'waiter' }) }}>
          {showForm ? 'Отмена' : '+ Добавить'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card form-card">
          <div className="form-row">
            <div className="form-group">
              <label>Имя</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Телефон</label>
              <input value={form.phone} onChange={(e) => handlePhoneChange(e.target.value)} required maxLength={13} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Пароль {editId && '(оставьте пустым для сохранения текущего)'}</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} maxLength={8} {...(!editId && { required: true })} />
            </div>
            <div className="form-group">
              <label>Роль</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary">{editId ? 'Сохранить' : 'Создать'}</button>
        </form>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Имя</th>
              <th>Телефон</th>
              <th>Роль</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.phone}</td>
                <td><span className={`badge badge-${u.role}`}>{ROLE_LABELS[u.role]}</span></td>
                <td>
                  <span className={`badge ${u.active ? 'badge-success' : 'badge-danger'}`} onClick={() => u.role !== 'admin' && toggleActive(u)} style={{ cursor: u.role !== 'admin' ? 'pointer' : 'default' }}>
                    {u.active ? 'Активен' : 'Неактивен'}
                  </span>
                </td>
                <td>
                  {u.role !== 'admin' && (
                    <div className="btn-group">
                      <button className="btn btn-sm btn-outline" onClick={() => handleEdit(u)}>✏️</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u.id)}>🗑️</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
