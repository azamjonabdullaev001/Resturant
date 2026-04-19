import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: API_URL + '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// Auth
export const login = (phone, password) => api.post('/login', { phone, password })
export const getMe = () => api.get('/me')

// Dashboard
export const getDashboard = () => api.get('/dashboard')

// Users
export const getUsers = () => api.get('/users')
export const createUser = (data) => api.post('/users', data)
export const updateUser = (id, data) => api.put(`/users/${id}`, data)
export const deleteUser = (id) => api.delete(`/users/${id}`)

// Tables
export const getTables = () => api.get('/tables')
export const createTable = (data) => api.post('/tables', data)
export const updateTableStatus = (id, status) => api.put(`/tables/${id}/status`, { status })
export const deleteTable = (id) => api.delete(`/tables/${id}`)

// Categories
export const getCategories = (panelType) =>
  api.get('/categories', { params: panelType ? { panel_type: panelType } : {} })
export const createCategory = (data) => api.post('/categories', data)
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data)
export const deleteCategory = (id) => api.delete(`/categories/${id}`)

// Menu
export const getMenu = (params) => api.get('/menu', { params })
export const getMenuItem = (id) => api.get(`/menu/${id}`)
export const createMenuItem = (data) => api.post('/menu', data)
export const updateMenuItem = (id, data) => api.put(`/menu/${id}`, data)
export const deleteMenuItem = (id) => api.delete(`/menu/${id}`)

// Orders
export const getOrders = (params) => api.get('/orders', { params })
export const getOrder = (id) => api.get(`/orders/${id}`)
export const createOrder = (data) => api.post('/orders', data)
export const markOrderPaid = (id) => api.put(`/orders/${id}/pay`)
export const cancelOrder = (id) => api.put(`/orders/${id}/cancel`)
export const getMyOrders = () => api.get('/my-orders')

// Kitchen panel
export const getPanelOrders = (panelType, status) =>
  api.get(`/panel/${panelType}/orders`, { params: { status } })
export const updateOrderItemStatus = (id, status) =>
  api.put(`/order-items/${id}/status`, { status })

// Upload
export const uploadImage = (file) => {
  const formData = new FormData()
  formData.append('image', file)
  return api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export default api
