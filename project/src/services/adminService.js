import api from './api'

export const adminService = {
  async getAll() {
    const response = await api.get('/admin/admins')
    return Array.isArray(response.data?.data) ? response.data.data : []
  },

  async create(admin) {
    const response = await api.post('/admin/admins', admin)
    return response.data.data
  },

  async delete(id) {
    const response = await api.delete(`/admin/admins/${id}`)
    return response.data
  },
}
