import { useState, useEffect } from 'react'
import { getTables, createTable, updateTableStatus, deleteTable } from '../../api'
import toast from 'react-hot-toast'

export default function ManageTables() {
  const [tables, setTables] = useState([])
  const [newNumber, setNewNumber] = useState('')

  const load = () => getTables().then((res) => setTables(res.data))
  useEffect(() => { load() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    try {
      await createTable({ table_number: parseInt(newNumber) })
      setNewNumber('')
      toast.success('Стол добавлен')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка')
    }
  }

  const handleToggleStatus = async (table) => {
    const newStatus = table.status === 'free' ? 'occupied' : 'free'
    await updateTableStatus(table.id, newStatus)
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить стол?')) return
    try {
      await deleteTable(id)
      toast.success('Стол удалён')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка')
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">Управление столами</h1>

      <form onSubmit={handleAdd} className="card form-card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Номер нового стола</label>
          <input type="number" value={newNumber} onChange={(e) => setNewNumber(e.target.value)} min="1" required placeholder="Введите номер..." />
        </div>
        <button type="submit" className="btn btn-primary">Добавить</button>
      </form>

      <div className="tables-grid">
        {tables.map((t) => (
          <div key={t.id} className={`table-card ${t.status}`}>
            <div className="table-number">Стол №{t.table_number}</div>
            <div className={`table-status ${t.status}`}>
              {t.status === 'free' ? '✅ Свободен' : '🔴 Занят'}
            </div>
            <div className="btn-group">
              <button className="btn btn-sm btn-outline" onClick={() => handleToggleStatus(t)}>
                {t.status === 'free' ? 'Занять' : 'Освободить'}
              </button>
              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {tables.length === 0 && <p className="empty-state">Столы не добавлены. Добавьте первый стол выше.</p>}
    </div>
  )
}
