const apiBaseUrl = 'https://psgc.cloud/api'
const responseCache = new Map()

async function getList(path) {
  if (!responseCache.has(path)) {
    const request = fetch(`${apiBaseUrl}${path}`, { signal: AbortSignal.timeout(15000) })
      .then(async (response) => {
        if (!response.ok) throw new Error('Philippine location directory is temporarily unavailable.')
        const data = await response.json()
        if (!Array.isArray(data)) throw new Error('Philippine location directory returned invalid data.')
        return data.map((item) => ({
          code: String(item.code),
          name: String(item.name || '').trim(),
          type: item.type || '',
        })).filter((item) => item.code && item.name)
      })
      .catch((error) => {
        responseCache.delete(path)
        if (error instanceof TypeError || error.name === 'TimeoutError') {
          throw new Error('Could not connect to the Philippine location directory. Please try again.')
        }
        throw error
      })
    responseCache.set(path, request)
  }
  return responseCache.get(path)
}

export const psgcService = {
  getRegions() {
    return getList('/regions')
  },
  getProvinces(regionCode) {
    return getList(`/regions/${encodeURIComponent(regionCode)}/provinces`)
  },
  getCitiesForRegion(regionCode) {
    return getList(`/regions/${encodeURIComponent(regionCode)}/cities-municipalities`)
  },
  getCitiesForProvince(provinceCode) {
    return getList(`/provinces/${encodeURIComponent(provinceCode)}/cities-municipalities`)
  },
  getBarangays(cityCode) {
    return getList(`/cities-municipalities/${encodeURIComponent(cityCode)}/barangays`)
  },
}
