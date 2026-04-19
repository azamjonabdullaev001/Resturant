import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './AuthContext'

import Login from './components/Login'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

import AdminDashboard from './pages/admin/AdminDashboard'
import ManageUsers from './pages/admin/ManageUsers'
import ManageTables from './pages/admin/ManageTables'
import ManageCategories from './pages/admin/ManageCategories'
import ManageMenu from './pages/admin/ManageMenu'
import OrdersHistory from './pages/admin/OrdersHistory'

import WaiterDashboard from './pages/waiter/WaiterDashboard'
import TakeOrder from './pages/waiter/TakeOrder'

import KitchenOrders from './pages/kitchen/KitchenOrders'
import KitchenMenu from './pages/kitchen/KitchenMenu'

const ROLE_ROUTES = {
  admin: '/admin',
  waiter: '/waiter',
  shashlik: '/kitchen/shashlik',
  samsa: '/kitchen/samsa',
  national: '/kitchen/national',
  dessert: '/kitchen/dessert',
}

function HomeRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading">Загрузка...</div>
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={ROLE_ROUTES[user.role] || '/login'} replace />
}

export default function App() {
  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<HomeRedirect />} />

        {/* Admin routes */}
        <Route path="/admin" element={
          <ProtectedRoute roles={['admin']}>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<ManageUsers />} />
          <Route path="tables" element={<ManageTables />} />
          <Route path="categories" element={<ManageCategories />} />
          <Route path="menu" element={<ManageMenu />} />
          <Route path="orders" element={<OrdersHistory />} />
        </Route>

        {/* Waiter routes */}
        <Route path="/waiter" element={
          <ProtectedRoute roles={['waiter']}>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<WaiterDashboard />} />
          <Route path="new-order" element={<TakeOrder />} />
        </Route>

        {/* Kitchen routes (shashlik, samsa, national, dessert) */}
        {['shashlik', 'samsa', 'national', 'dessert'].map((type) => (
          <Route key={type} path={`/kitchen/${type}`} element={
            <ProtectedRoute roles={[type]}>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<KitchenOrders />} />
            <Route path="menu" element={<KitchenMenu />} />
          </Route>
        ))}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
