
<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import EventLocationMap from './EventLocationMap.vue'
import { isMapboxConfigured, searchMapboxLocations } from '../services/mapboxService'
import { psgcService } from '../services/psgcService'

const props = defineProps({
  initialEvent: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['submit', 'cancel'])
const coverImage = ref(null)
const previewUrl = ref('')
const removeExistingImage = ref(false)
const fileInput = ref(null)
const locationResults = ref([])
const locationSearching = ref(false)
const locationError = ref('')
const selectedLocation = ref(null)
const mapPreviewLocation = ref(null)
const regions = ref([])
const provinces = ref([])
const cities = ref([])
const regionLocalities = ref([])
const submunicipalities = ref([])
const barangays = ref([])
const selectedRegionCode = ref('')
const selectedProvinceCode = ref('')
const selectedCityCode = ref('')
const selectedSubmunicipalityCode = ref('')
const selectedBarangayCode = ref('')
const locationDirectoryLoading = ref(false)
const retryLocationRequest = ref(null)
let locationSearchRequest = 0

const emptyForm = () => ({
  title: '',
  description: '',
  location: '',
  latitude: null,
  longitude: null,
  event_date: '',
  event_time: '',
  organizer: '',
  capacity: 0,
})

const form = reactive(emptyForm())
const selectedAdministrativeLocation = computed(() => {
  const selectedName = (items, code) => items.find((item) => item.code === code)?.name
  return [
    selectedName(barangays.value, selectedBarangayCode.value),
    selectedName(submunicipalities.value, selectedSubmunicipalityCode.value),
    selectedName(cities.value, selectedCityCode.value),
    selectedName(provinces.value, selectedProvinceCode.value),
    selectedName(regions.value, selectedRegionCode.value),
  ].filter(Boolean).join(', ')
})
const locationSearchQuery = computed(() => [
  form.location.trim(),
  selectedAdministrativeLocation.value,
  'Philippines',
].filter(Boolean).join(', '))

function clearPreview() {
  if (previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewUrl.value = ''
}

watch(
  () => props.initialEvent,
  (event) => {
    Object.assign(form, emptyForm(), event || {})
    locationResults.value = []
    locationError.value = ''
    mapPreviewLocation.value = null
    selectedLocation.value = event?.latitude != null && event?.longitude != null
      ? { label: event.location, latitude: Number(event.latitude), longitude: Number(event.longitude) }
      : null
    selectedRegionCode.value = ''
    selectedProvinceCode.value = ''
    selectedCityCode.value = ''
    selectedSubmunicipalityCode.value = ''
    selectedBarangayCode.value = ''
    provinces.value = []
    cities.value = []
    regionLocalities.value = []
    submunicipalities.value = []
    barangays.value = []
    coverImage.value = null
    removeExistingImage.value = false
    clearPreview()

    if (event?.event_date) {
      form.event_date = String(event.event_date).slice(0, 10)
    }

    if (event?.event_time) {
      form.event_time = String(event.event_time).slice(0, 5)
    }
  },
  { immediate: true },
)

function clearSelectedLocation() {
  locationSearchRequest += 1
  retryLocationRequest.value = null
  form.latitude = null
  form.longitude = null
  selectedLocation.value = null
  mapPreviewLocation.value = null
  locationResults.value = []
  locationError.value = ''
}

function selectMapLocation(coordinates) {
  form.latitude = coordinates.latitude
  form.longitude = coordinates.longitude
  selectedLocation.value = {
    label: form.location || selectedAdministrativeLocation.value || 'Selected map pin',
    ...coordinates,
  }
  mapPreviewLocation.value = null
  locationError.value = ''
  retryLocationRequest.value = null
}

async function loadRegions() {
  locationDirectoryLoading.value = true
  locationError.value = ''
  retryLocationRequest.value = null
  try {
    regions.value = await psgcService.getRegions()
  } catch (error) {
    locationError.value = error instanceof Error ? error.message : 'Could not load Philippine locations.'
    retryLocationRequest.value = loadRegions
  } finally {
    locationDirectoryLoading.value = false
  }
}

async function selectRegion() {
  clearSelectedLocation()
  const regionCode = selectedRegionCode.value
  selectedProvinceCode.value = ''
  selectedCityCode.value = ''
  selectedSubmunicipalityCode.value = ''
  selectedBarangayCode.value = ''
  provinces.value = []
  cities.value = []
  regionLocalities.value = []
  submunicipalities.value = []
  barangays.value = []
  if (!regionCode) return

  locationDirectoryLoading.value = true
  try {
    const regionProvinces = await psgcService.getProvinces(regionCode)
    if (regionCode !== selectedRegionCode.value) return
    provinces.value = regionProvinces
    if (!regionProvinces.length) {
      const regionCities = await psgcService.getCitiesForRegion(regionCode)
      if (regionCode === selectedRegionCode.value) {
        regionLocalities.value = regionCities
        cities.value = regionCities.filter((city) => city.type.toLowerCase() !== 'submun')
      }
    }
  } catch (error) {
    locationError.value = error instanceof Error ? error.message : 'Could not load provinces and cities.'
    retryLocationRequest.value = selectRegion
  } finally {
    locationDirectoryLoading.value = false
  }
}

async function selectProvince() {
  clearSelectedLocation()
  const provinceCode = selectedProvinceCode.value
  selectedCityCode.value = ''
  selectedSubmunicipalityCode.value = ''
  selectedBarangayCode.value = ''
  cities.value = []
  submunicipalities.value = []
  barangays.value = []
  if (!provinceCode) return

  locationDirectoryLoading.value = true
  try {
    const results = await psgcService.getCitiesForProvince(provinceCode)
    if (provinceCode === selectedProvinceCode.value) cities.value = results
  } catch (error) {
    locationError.value = error instanceof Error ? error.message : 'Could not load cities and municipalities.'
    retryLocationRequest.value = selectProvince
  } finally {
    locationDirectoryLoading.value = false
  }
}

async function selectCity() {
  clearSelectedLocation()
  const cityCode = selectedCityCode.value
  const city = cities.value.find((item) => item.code === cityCode)
  selectedSubmunicipalityCode.value = ''
  selectedBarangayCode.value = ''
  submunicipalities.value = []
  barangays.value = []
  if (!cityCode) return

  locationDirectoryLoading.value = true
  try {
    const results = await psgcService.getBarangays(cityCode)
    if (cityCode !== selectedCityCode.value) return
    barangays.value = results
    if (!results.length && city?.type.toLowerCase() === 'city') {
      submunicipalities.value = regionLocalities.value.filter((locality) =>
        locality.type.toLowerCase() === 'submun' && locality.code.startsWith(cityCode.slice(0, 6)))
    }
  } catch (error) {
    locationError.value = error instanceof Error ? error.message : 'Could not load barangays.'
    retryLocationRequest.value = selectCity
  } finally {
    locationDirectoryLoading.value = false
  }
}

async function selectSubmunicipality() {
  clearSelectedLocation()
  const code = selectedSubmunicipalityCode.value
  selectedBarangayCode.value = ''
  barangays.value = []
  if (!code) return

  locationDirectoryLoading.value = true
  try {
    const results = await psgcService.getBarangays(code)
    if (code === selectedSubmunicipalityCode.value) barangays.value = results
  } catch (error) {
    locationError.value = error instanceof Error ? error.message : 'Could not load barangays.'
    retryLocationRequest.value = selectSubmunicipality
  } finally {
    locationDirectoryLoading.value = false
  }
}

function selectBarangay() {
  clearSelectedLocation()
}

async function searchLocation() {
  const query = locationSearchQuery.value.trim()
  if (query.length < 3) {
    locationError.value = 'Enter a venue, address, or select a Philippine location first.'
    return
  }

  const requestId = ++locationSearchRequest
  locationSearching.value = true
  locationError.value = ''
  locationResults.value = []
  try {
    const results = await searchMapboxLocations(query)
    if (requestId !== locationSearchRequest) return
    locationResults.value = results
    if (!results.length) locationError.value = 'No matching map area found. Select the location directly on the map.'
  } catch (error) {
    if (requestId === locationSearchRequest) {
      locationError.value = error instanceof Error ? error.message : 'Could not search places right now.'
    }
  } finally {
    if (requestId === locationSearchRequest) locationSearching.value = false
  }
}

function selectLocation(location) {
  locationSearchRequest += 1
  locationSearching.value = false
  form.latitude = null
  form.longitude = null
  selectedLocation.value = null
  mapPreviewLocation.value = location
  locationResults.value = []
  locationError.value = 'Area found. Click the exact venue on the map or drag the pin there to save its location.'
}

function selectCoverImage(event) {
  const file = event.target.files?.[0]
  coverImage.value = file || null
  removeExistingImage.value = false
  clearPreview()

  if (file) previewUrl.value = URL.createObjectURL(file)
}

function removeCoverImage() {
  coverImage.value = null
  clearPreview()
  removeExistingImage.value = Boolean(props.initialEvent?.image_url)

  if (fileInput.value) fileInput.value.value = ''
}

function submitForm() {
  if (!form.location.trim() && !selectedRegionCode.value) {
    locationError.value = 'Enter a venue or address, or select its Philippine region.'
    return
  }

  const locationParts = [
    form.location.trim(),
    selectedAdministrativeLocation.value,
    'Philippines',
  ].filter((part, index, parts) => part
    && parts.findIndex((value) => value.toLocaleLowerCase() === part.toLocaleLowerCase()) === index)
  const fullLocation = locationParts.join(', ')

  if (!fullLocation) {
    locationError.value = 'Enter a venue or address, or select its province, city, and barangay.'
    return
  }
  if (fullLocation.length > 255) {
    locationError.value = 'Shorten the venue or address so the complete location is no longer than 255 characters.'
    return
  }
  if (isMapboxConfigured && (form.latitude == null || form.longitude == null)) {
    locationError.value = 'Choose the exact point on the map so attendees can see the right pin.'
    return
  }

  emit('submit', {
    ...form,
    location: fullLocation,
    capacity: Number(form.capacity),
    event_time: form.event_time || null,
    description: form.description || null,
    organizer: form.organizer || null,
    cover_image: coverImage.value,
    remove_image: removeExistingImage.value,
  })
}

onMounted(loadRegions)
onBeforeUnmount(clearPreview)
</script>

<template>
  <form class="event-form" @submit.prevent="submitForm">
    <div class="form-header">
      <p class="form-kicker">EVENT DETAILS</p>
      <h2>{{ initialEvent ? 'Edit event' : 'Create event' }}</h2>
    </div>

    <div class="form-fields">
      <label class="form-field form-field-wide">
        <span>Event title <span class="field-required">Required</span></span>
        <input v-model.trim="form.title" required maxlength="255" placeholder="Name your event" />
      </label>

      <label class="form-field">
        <span>Venue or address</span>
        <input v-model.trim="form.location" maxlength="255" placeholder="Venue, street, or landmark" @input="clearSelectedLocation" />
      </label>

      <label class="form-field">
        <span>Organizer</span>
        <input v-model.trim="form.organizer" maxlength="255" placeholder="Name or team" />
      </label>

      <div class="form-field form-field-wide location-picker">
        <span>Philippine location</span>
        <p class="location-picker-help">
          Choose a region, province, city or municipality, and barangay. These administrative names come from the Philippine Standard Geographic Code directory; type a name while a dropdown is focused to jump to it.
        </p>
        <div class="location-hierarchy">
          <label class="location-select-field">
            <span>Region</span>
            <select v-model="selectedRegionCode" :disabled="locationDirectoryLoading || !regions.length" @change="selectRegion">
              <option value="">{{ locationDirectoryLoading && !regions.length ? 'Loading regions…' : 'Select region' }}</option>
              <option v-for="region in regions" :key="region.code" :value="region.code">{{ region.name }}</option>
            </select>
          </label>
          <label v-if="provinces.length" class="location-select-field">
            <span>Province</span>
            <select v-model="selectedProvinceCode" :disabled="locationDirectoryLoading" @change="selectProvince">
              <option value="">Select province</option>
              <option v-for="province in provinces" :key="province.code" :value="province.code">{{ province.name }}</option>
            </select>
          </label>
          <label v-if="cities.length" class="location-select-field">
            <span>City / municipality</span>
            <select v-model="selectedCityCode" :disabled="locationDirectoryLoading" @change="selectCity">
              <option value="">Select city / municipality</option>
              <option v-for="city in cities" :key="city.code" :value="city.code">{{ city.name }}</option>
            </select>
          </label>
          <label v-if="submunicipalities.length" class="location-select-field">
            <span>District / submunicipality</span>
            <select v-model="selectedSubmunicipalityCode" :disabled="locationDirectoryLoading" @change="selectSubmunicipality">
              <option value="">Select district</option>
              <option v-for="submunicipality in submunicipalities" :key="submunicipality.code" :value="submunicipality.code">{{ submunicipality.name }}</option>
            </select>
          </label>
          <label v-if="barangays.length" class="location-select-field">
            <span>Barangay</span>
            <select v-model="selectedBarangayCode" :disabled="locationDirectoryLoading" @change="selectBarangay">
              <option value="">Select barangay</option>
              <option v-for="barangay in barangays" :key="barangay.code" :value="barangay.code">{{ barangay.name }}</option>
            </select>
          </label>
        </div>
        <p v-if="selectedAdministrativeLocation" class="selected-admin-area" role="status">
          Selected area: {{ selectedAdministrativeLocation }}
        </p>
        <p v-if="!isMapboxConfigured" class="location-picker-help">
          Map search and pin selection require a public Mapbox token.
        </p>
        <div class="location-search-row">
          <button type="button" class="location-search-button" :disabled="!isMapboxConfigured || locationSearching || locationSearchQuery.trim().length < 3" @click="searchLocation">
            {{ locationSearching ? 'Searching on map…' : 'Find area on map' }}
          </button>
          <span v-if="selectedLocation" class="location-selected-status" role="status">
            Exact pin selected · {{ selectedLocation.latitude.toFixed(5) }}, {{ selectedLocation.longitude.toFixed(5) }}
          </span>
          <span v-else-if="mapPreviewLocation" class="location-preview-status" role="status">
            {{ mapPreviewLocation.label }} · click the exact point to place the pin
          </span>
        </div>
        <p v-if="locationError" class="location-picker-error" role="alert">{{ locationError }}</p>
        <button
          v-if="retryLocationRequest"
          type="button"
          class="location-retry-button"
          @click="retryLocationRequest()"
        >
          Retry loading locations
        </button>
        <div v-if="locationResults.length" class="location-search-results" aria-label="Map search results">
          <button
            v-for="location in locationResults"
            :key="location.id"
            type="button"
            class="location-search-result"
            @click="selectLocation(location)"
          >
            <span aria-hidden="true">⌖</span>
            <span>{{ location.label }}</span>
          </button>
        </div>
        <p v-if="isMapboxConfigured" class="location-picker-help">
          Search suggestions only center the map; they are not saved as exact coordinates. Place the pin by clicking the venue or dragging it. The map is limited to the Philippines.
        </p>
        <EventLocationMap
          v-if="isMapboxConfigured"
          :latitude="selectedLocation?.latitude ?? null"
          :longitude="selectedLocation?.longitude ?? null"
          :preview-latitude="mapPreviewLocation?.latitude ?? null"
          :preview-longitude="mapPreviewLocation?.longitude ?? null"
          interactive
          @select-location="selectMapLocation"
          @invalid-location="locationError = 'Choose a point within the Philippines.'"
        />
      </div>

      <label class="form-field">
        <span>Date <span class="field-required">Required</span></span>
        <input v-model="form.event_date" type="date" required />
      </label>

      <label class="form-field">
        <span>Time</span>
        <input v-model="form.event_time" type="time" />
      </label>

      <label class="form-field">
        <span>Capacity</span>
        <input
          v-model.number="form.capacity"
          type="number"
          min="0"
          max="4294967295"
          required
        />
      </label>

      <label class="form-field form-field-wide">
        <span>Description</span>
        <textarea v-model="form.description" rows="3" placeholder="Add a short event overview"></textarea>
      </label>

      <div class="form-field form-field-wide cover-field">
        <span>Event cover image <small>Optional · JPG, PNG, GIF or WebP · up to 5 MB</small></span>
        <div class="cover-upload">
          <div class="cover-preview" :class="{ 'cover-preview-empty': !previewUrl && !initialEvent?.image_url }">
            <img v-if="previewUrl || (!removeExistingImage && initialEvent?.image_url)" :src="previewUrl || initialEvent.image_url" alt="Event cover preview" />
            <span v-else aria-hidden="true">✦</span>
          </div>
          <div class="cover-upload-actions">
            <p>Add a clear image to help people recognize and remember your event.</p>
            <div>
              <button type="button" class="choose-image-btn" @click="fileInput?.click()">
                {{ previewUrl || (!removeExistingImage && initialEvent?.image_url) ? 'Choose a different image' : 'Choose image' }}
              </button>
              <button v-if="previewUrl || (!removeExistingImage && initialEvent?.image_url)" type="button" class="remove-image-btn" @click="removeCoverImage">Remove image</button>
            </div>
            <input
              ref="fileInput"
              class="cover-file-input"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              aria-label="Choose event cover image"
              @change="selectCoverImage"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="form-actions">
      <button type="button" class="cancel-btn" @click="$emit('cancel')">
        Cancel
      </button>
      <button type="submit" class="save-btn" :disabled="loading">
        {{ loading ? 'Saving...' : initialEvent ? 'Save changes' : 'Create event' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.event-form {
  display: grid;
  gap: 22px;
  padding: 25px 27px;
  border: 1px solid #dce4dc;
  border-left: 4px solid #286453;
  border-radius: 6px;
  background: #fff;
}

.form-header {
  display: grid;
  gap: 5px;
}

.form-kicker {
  color: #286453;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
}

.event-form h2 {
  margin: 0;
  color: #1d2923;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 25px;
  font-weight: 600;
}

.form-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.form-field {
  display: grid;
  align-content: start;
  gap: 7px;
  min-width: 0;
  color: #34443b;
  font-size: 12px;
  font-weight: 700;
}

.location-picker {
  gap: 9px;
}

.location-picker-help {
  margin: -2px 0 0;
  color: #718078;
  font-size: 11px;
  font-weight: 400;
  line-height: 1.5;
}

.location-hierarchy {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.location-select-field {
  display: grid;
  gap: 6px;
  color: #52645a;
  font-size: 10px;
  font-weight: 700;
}

.location-select-field select {
  width: 100%;
  min-height: 39px;
  padding: 0 10px;
  border: 1px solid #d5ded6;
  border-radius: 5px;
  background: #fcfdfb;
  color: #34443b;
  font-size: 11px;
  font-weight: 400;
}

.location-select-field select:disabled {
  cursor: wait;
  opacity: .7;
}

.selected-admin-area,
.location-preview-status {
  margin: 0;
  color: #84601e;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.5;
}

.selected-admin-area {
  color: #286453;
}

.location-search-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.location-search-button {
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid #286453;
  border-radius: 5px;
  background: #286453;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

.location-search-button:disabled {
  cursor: not-allowed;
  opacity: .52;
}

.location-selected-status {
  color: #286453;
  font-size: 11px;
  font-weight: 600;
}

.location-picker-error {
  margin: 0;
  color: #a33b2d;
  font-size: 11px;
  font-weight: 500;
}

.location-retry-button {
  justify-self: start;
  padding: 5px 0;
  border: 0;
  background: transparent;
  color: #286453;
  font-size: 11px;
  font-weight: 700;
  text-decoration: underline;
}

.location-search-results {
  display: grid;
  overflow: hidden;
  border: 1px solid #d5ded6;
  border-radius: 6px;
}

.location-search-result {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 11px 12px;
  border: 0;
  border-bottom: 1px solid #e8eee8;
  background: #fff;
  color: #34443b;
  text-align: left;
  font-size: 11px;
  line-height: 1.45;
}

.location-search-result:last-child {
  border-bottom: 0;
}

.location-search-result:hover {
  background: #f0f7f1;
}

.location-search-result > span:first-child {
  color: #286453;
  font-size: 16px;
}

.form-field-wide {
  grid-column: 1 / -1;
}

.cover-field > span small {
  margin-left: 6px;
  color: #78877e;
  font-size: 10px;
  font-weight: 400;
}

.cover-upload {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px;
  border: 1px dashed #cbd9ce;
  border-radius: 6px;
  background: #fbfdfb;
}

.cover-preview {
  width: 112px;
  height: 78px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 5px;
  background: linear-gradient(135deg, #0a4739, #2a7950);
  color: #e4d98d;
  font-size: 27px;
}

.cover-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-preview-empty {
  background: linear-gradient(135deg, #e9f2eb, #f3f5e9);
  color: #55816b;
}

.cover-upload-actions {
  display: grid;
  gap: 8px;
}

.cover-upload-actions p {
  margin: 0;
  color: #718078;
  font-size: 11px;
  font-weight: 400;
  line-height: 1.5;
}

.cover-upload-actions > div {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.cover-upload-actions button {
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid #d5ded6;
  border-radius: 4px;
  background: #fff;
  color: #286453;
  font-size: 10px;
  font-weight: 700;
}

.cover-upload-actions .remove-image-btn {
  color: #875a50;
}

.cover-file-input {
  display: none;
}

.field-required {
  margin-left: 5px;
  color: #8a948d;
  font-size: 10px;
  font-weight: 500;
}

.event-form input,
.event-form textarea {
  width: 100%;
  min-height: 40px;
  padding: 9px 11px;
  border: 1px solid #d5ded6;
  border-radius: 4px;
  background: #fcfdfb;
  color: #1d2923;
  font: inherit;
  font-weight: 400;
}

.event-form textarea {
  min-height: 84px;
  resize: vertical;
}

.event-form input:focus-visible,
.event-form textarea:focus-visible {
  outline: 3px solid rgb(40 100 83 / 15%);
  border-color: #286453;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  padding-top: 17px;
  border-top: 1px solid #e7ece7;
}

.form-actions button {
  min-height: 39px;
  padding: 0 14px;
  border: 1px solid #d5ded6;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
}

.form-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-actions .cancel-btn {
  background: #fff;
  color: #526158;
}

.form-actions .save-btn {
  border-color: #286453;
  background: #286453;
  color: #fff;
}

@media (max-width: 480px) {
  .event-form {
    gap: 18px;
    padding: 20px 17px;
  }

  .form-fields {
    grid-template-columns: 1fr;
    gap: 13px;
  }

  .form-field-wide {
    grid-column: auto;
  }

  .cover-field.form-field-wide {
    grid-column: auto;
  }

  .cover-upload {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
