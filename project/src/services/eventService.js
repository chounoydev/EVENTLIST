
import api from './api'

function toFormData(event, method = null) {
  const formData = new FormData()

  if (method) formData.append('_method', method)

  Object.entries(event).forEach(([key, value]) => {
    if (key === 'cover_image') {
      if (value instanceof File) formData.append(key, value)
      return
    }

    if (key === 'remove_image') {
      formData.append(key, value ? '1' : '0')
      return
    }

    if (value !== undefined && value !== null) {
      formData.append(key, String(value))
    }
  })

  return formData
}

export const eventService = {
  async getPublic() {
    const response = await api.get('/public/events')
    return Array.isArray(response.data?.data) ? response.data.data : []
  },

  async getAll() {
    const response = await api.get('/events')
    return Array.isArray(response.data?.data) ? response.data.data : []
  },

  async create(event) {
    const response = await api.post('/events', toFormData(event))
    return response.data.data
  },

  async update(id, event) {
    const response = await api.post(`/events/${id}`, toFormData(event, 'PUT'))
    return response.data.data
  },

  async delete(id) {
    const response = await api.delete(`/events/${id}`)
    return response.data
  },
}
