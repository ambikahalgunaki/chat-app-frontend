import axios from 'axios'

// ✅ CHANGE THIS to your Render URL with /api
const API = axios.create({
  baseURL: 'https://chat-app-backend-nw6m.onrender.com/api', // ✅ Added /api
})

// Request interceptor to attach the token to every API call
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor to handle errors (like expired/invalid tokens)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default API