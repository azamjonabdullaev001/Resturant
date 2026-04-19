import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import toast from 'react-hot-toast'

const ROLE_ROUTES = {
  admin: '/admin',
  waiter: '/waiter',
  shashlik: '/kitchen/shashlik',
  samsa: '/kitchen/samsa',
  national: '/kitchen/national',
  dessert: '/kitchen/dessert',
}

export default function Login() {
  const [phone, setPhone] = useState('+998')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login(phone, password)
      toast.success(`Добро пожаловать, ${user.name}!`)
      navigate(ROLE_ROUTES[user.role] || '/')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneChange = (e) => {
    let val = e.target.value
    if (!val.startsWith('+998')) {
      val = '+998'
    }
    // Only allow digits after +998
    const suffix = val.slice(4).replace(/\D/g, '')
    setPhone('+998' + suffix)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🍽️</div>
          <h1>Ресторан</h1>
          <p>Система управления</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Номер телефона</label>
            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="+998XXXXXXXXX"
              required
              maxLength={13}
            />
          </div>
          <div className="form-group">
            <label>Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              required
              maxLength={8}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}
            style={{ padding: '0.8rem', fontSize: '0.95rem', marginTop: '0.5rem' }}>
            {loading ? 'Вход...' : 'Войти в систему'}
          </button>
        </form>
      </div>
    </div>
  )
}
