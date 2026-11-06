import api from './api'

export const heroSlideService = {
  async getPublic() {
    const response = await api.get('/public/slides')
    return response.data.data
  },

  async getAll() {
    const response = await api.get('/admin/slides')
    return response.data.data
  },

  async create(slide) {
    const response = await api.post('/admin/slides', slide)
    return response.data.data
  },

  async update(id, slide) {
    const response = await api.put(`/admin/slides/${id}`, slide)
    return response.data.data
  },

  async delete(id) {
    const response = await api.delete(`/admin/slides/${id}`)
    return response.data
  },
}
