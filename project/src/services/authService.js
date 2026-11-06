import api from './api'

const TOKEN_KEY = 'eventlist_token'

export const authService = {
  async login(credentials) {
    const response = await api.post('/login', credentials)
    return response.data
  },

  async register(account) {
    const response = await api.post('/register', account)
    return response.data
  },

  async currentUser() {
    const response = await api.get('/user')
    return response.data
  },

  async logout() {
    await api.post('/logout')
  },

  async forgotPassword(email, password, passwordConfirmation) {
    const response = await api.post('/forgot-password', {
      email,
      password,
      password_confirmation: passwordConfirmation,
    })
    return response.data
  },

  async resetPassword(payload) {
    const response = await api.post('/reset-password', payload)
    return response.data
  },

  getToken() {
    return localStorage.getItem(TOKEN_KEY)
  },

  setToken(token) {
    localStorage.setItem(TOKEN_KEY, token)
  },

  clearToken() {
    localStorage.removeItem(TOKEN_KEY)
  },
}
