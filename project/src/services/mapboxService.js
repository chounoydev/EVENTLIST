const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim()

export const isMapboxConfigured = Boolean(accessToken)

export async function searchMapboxLocations(query) {
  if (!accessToken) {
    throw new Error('Map search is not configured. Add a public Mapbox access token to VITE_MAPBOX_ACCESS_TOKEN.')
  }

  const searchText = /\bphilippines\b/i.test(query) ? query : `${query}, Philippines`
  const url = new URL('https://api.mapbox.com/search/geocode/v6/forward')
  url.searchParams.set('q', searchText)
  url.searchParams.set('country', 'PH')
  url.searchParams.set('types', 'region,postcode,district,place,locality,neighborhood,street,address')
  url.searchParams.set('access_token', accessToken)
  url.searchParams.set('language', 'en')
  url.searchParams.set('limit', '8')

  const response = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Mapbox search is temporarily rate-limited. You can still set the exact pin by clicking the map.')
    }
    throw new Error(response.status === 401 || response.status === 403
      ? 'Mapbox rejected this token or geocoding request. Check token URL restrictions and public geocoding access.'
      : 'Could not search places right now. Please try again.')
  }

  const data = await response.json()
  return (data.features || []).flatMap((feature, index) => {
    const [longitude, latitude] = feature.geometry?.coordinates || []
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return []

    const properties = feature.properties || {}
    const label = properties.full_address
      || [properties.name, properties.place_formatted].filter(Boolean).join(', ')
    return label
      ? [{ id: properties.mapbox_id || `${latitude}-${longitude}-${index}`, label, latitude, longitude }]
      : []
  })
}
