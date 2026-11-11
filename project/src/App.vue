<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import EventForm from './components/EventForm.vue'
import EventLocationMap from './components/EventLocationMap.vue'
import { adminService } from './services/adminService'
import { authService } from './services/authService'
import { eventService } from './services/eventService'
import { heroSlideService } from './services/heroSlideService'

const user = ref(null)
const events = ref([])
const publicEvents = ref([])
const heroSlides = ref([])
const heroSlidesLoaded = ref(false)
const managedHeroSlides = ref([])
const admins = ref([])
const loading = ref(false)
const saving = ref(false)
const formError = ref('')
const signingIn = ref(false)
const sessionLoading = ref(true)
const error = ref('')
const authError = ref('')
const authSuccess = ref('')
const authMode = ref('login')
const passwordVisible = ref(false)
const confirmationPasswordVisible = ref(false)
const forgotPasswordOpen = ref(false)
const forgotPasswordEmail = ref('')
const forgotPasswordLoading = ref(false)
const forgotPasswordError = ref('')
const forgotPasswordSuccess = ref('')
const resetPasswordOpen = ref(false)
const resetPasswordLoading = ref(false)
const resetPasswordError = ref('')
const resetPasswordSuccess = ref('')
const resetPasswordToken = ref('')
const resetPasswordEmail = ref('')
const resetPasswordVisible = ref(false)
const resetConfirmationVisible = ref(false)
const resetPasswordForm = reactive({
  password: '',
  password_confirmation: '',
})
const publicLoading = ref(false)
const publicError = ref('')
const slideError = ref('')
const slideSuccess = ref('')
const slideLoading = ref(false)
const slideSaving = ref(false)
const slideEditorOpen = ref(false)
const editingSlideId = ref(null)
const slideDeleteBusy = ref(null)
const publicSearch = ref('')
const publicEventFilter = ref('all')
const adminError = ref('')
const adminSuccess = ref('')
const adminLoading = ref(false)
const adminSaving = ref(false)
const adminModalOpen = ref(false)
const search = ref('')
const dateFilter = ref('all')
const sortOrder = ref('soonest')
const portalPages = ['dashboard', 'events', 'create-event', 'calendar', 'analytics', 'homepage', 'administrators']
const requestedPage = window.location.hash.slice(1)
const currentPage = ref(portalPages.includes(requestedPage) ? requestedPage : 'dashboard')
const selectedCalendarDate = ref('')
const calendarMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const showForm = ref(false)
const editingEvent = ref(null)
const portalPageContent = computed(() => ({
  events: {
    title: 'Event management',
    description: 'Create, search, update, and organize your event schedule.',
  },
  'create-event': {
    title: editingEvent.value ? 'Edit event' : 'Create an event',
    description: editingEvent.value
      ? 'Update event details and keep your community informed.'
      : 'Add a new event to your schedule and public listing.',
  },
  calendar: {
    title: 'Event calendar',
    description: 'Review scheduled events by date and open a day to see its events.',
  },
  analytics: {
    title: 'Analytics overview',
    description: 'A clear overview of your event schedule and capacity.',
  },
  homepage: {
    title: 'Homepage content',
    description: 'Manage the announcements visitors see on the public homepage.',
  },
  administrators: {
    title: 'Administrator access',
    description: 'Owner-managed access to the Eventlist admin portal.',
  },
})[currentPage.value])
const selectedEventDetails = ref(null)
const eventDetailsCloseButton = ref(null)
const eventDetailsTrigger = ref(null)
const profileMenuOpen = ref(false)
const activePublicSlide = ref(0)
const isPublicHeroPaused = ref(false)
let publicEventsTimer
let publicHeroTimer
const defaultPublicHeroSlides = [
  {
    kicker: 'YOUR NEXT GOOD DAY STARTS HERE',
    title: ['Find your people.', 'Make a memory.'],
    description: 'Explore upcoming events and find something worth looking forward to.',
    art: ['Make', 'it a', 'moment.'],
    symbol: '✦',
  },
  {
    kicker: 'BRING YOUR COMMUNITY TOGETHER',
    title: ['Good plans.', 'Better together.'],
    description: 'From local celebrations to shared interests, discover a reason to get together.',
    art: ['Meet', 'share', 'repeat.'],
    symbol: '✳',
  },
  {
    kicker: 'THERE IS ALWAYS SOMETHING HAPPENING',
    title: ['Your next story', 'starts here.'],
    description: 'Find fresh announcements and make space for the moments that matter.',
    art: ['Find', 'your', 'next.'],
    symbol: '✧',
  },
]
const slideForm = reactive({
  eyebrow: '',
  title: '',
  description: '',
  art_text: '',
  symbol: '✦',
  sort_order: 0,
  is_active: true,
})
const authForm = reactive({
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
})
const adminForm = reactive({
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
})

const today = dateToIso(new Date())
const calendarTitle = computed(() => calendarMonth.value.toLocaleDateString('en-US', {
  month: 'long',
  year: 'numeric',
}))
const calendarEventsByDate = computed(() => {
  const groupedEvents = new Map()
  events.value.forEach((event) => {
    const date = String(event.event_date).slice(0, 10)
    const eventsOnDate = groupedEvents.get(date) || []
    eventsOnDate.push(event)
    groupedEvents.set(date, eventsOnDate)
  })
  return groupedEvents
})

const calendarDays = computed(() => {
  const year = calendarMonth.value.getFullYear()
  const month = calendarMonth.value.getMonth()
  const offset = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = []

  for (let index = 0; index < offset; index += 1) {
    days.push(null)
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const isoDate = dateToIso(new Date(year, month, day))
    days.push({
      day,
      isoDate,
      isToday: isoDate === today,
      hasEvent: events.value.some((event) => String(event.event_date).slice(0, 10) === isoDate),
    })
  }

  return days
})

const filteredEvents = computed(() => {
  const term = search.value.trim().toLowerCase()

  return events.value
    .filter((event) => {
      const eventDate = String(event.event_date).slice(0, 10)
      const searchableText = [event.title, event.location, event.organizer, event.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const matchesSearch = !term || searchableText.includes(term)
      const matchesDate = selectedCalendarDate.value
        ? eventDate === selectedCalendarDate.value
        : dateFilter.value === 'all'
          || (dateFilter.value === 'upcoming' && eventDate >= today)
          || (dateFilter.value === 'past' && eventDate < today)

      return matchesSearch && matchesDate
    })
    .sort((left, right) => {
      const dateOrder = String(left.event_date).localeCompare(String(right.event_date))
        || String(left.event_time || '').localeCompare(String(right.event_time || ''))

      return sortOrder.value === 'soonest' ? dateOrder : -dateOrder
    })
})

const upcomingEvents = computed(() =>
  events.value
    .filter((event) => String(event.event_date).slice(0, 10) >= today)
    .sort((left, right) => String(left.event_date).localeCompare(String(right.event_date))),
)

const upcomingCount = computed(() => upcomingEvents.value.length)
const publicHeroSlides = computed(() => {
  if (!heroSlidesLoaded.value) return defaultPublicHeroSlides

  const activeSlides = (Array.isArray(heroSlides.value) ? heroSlides.value : [])
    .filter((slide) => slide.is_active)
    .sort((left, right) => left.sort_order - right.sort_order || left.id - right.id)

  return activeSlides.map((slide) => ({
    kicker: slide.eyebrow,
    title: slide.title.split('|').map((line) => line.trim()).filter(Boolean),
    description: slide.description,
    art: slide.art_text.split('|').map((line) => line.trim()).filter(Boolean),
    symbol: slide.symbol,
  }))
})
const publicUpcomingEvents = computed(() =>
  publicEvents.value
    .filter((event) => String(event.event_date).slice(0, 10) >= today)
    .sort((left, right) => String(left.event_date).localeCompare(String(right.event_date))),
)
const publicPastEvents = computed(() =>
  publicEvents.value
    .filter((event) => String(event.event_date).slice(0, 10) < today)
    .sort((left, right) => String(right.event_date).localeCompare(String(left.event_date))),
)
const publicFilteredEvents = computed(() => {
  if (publicEventFilter.value === 'upcoming') return publicUpcomingEvents.value
  if (publicEventFilter.value === 'past') return publicPastEvents.value

  return [...publicUpcomingEvents.value, ...publicPastEvents.value]
})
const visiblePublicEvents = computed(() => {
  const term = publicSearch.value.trim().toLowerCase()

  return publicFilteredEvents.value.filter((event) =>
    !term || [event.title, event.location, event.organizer, event.description]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(term),
  )
})
const featuredPublicEvents = computed(() => publicUpcomingEvents.value.slice(0, 3))
const publicVenueCount = computed(() => new Set(
  publicEvents.value.map((event) => String(event.location || '').trim()).filter(Boolean),
).size)
const publicLocations = computed(() => [...new Set(
  publicEvents.value.map((event) => String(event.location || '').trim()).filter(Boolean),
)].slice(0, 6))
const currentYear = computed(() => new Date().getFullYear())
const totalCapacity = computed(() =>
  events.value.reduce((total, event) => total + Number(event.capacity || 0), 0),
)
const eventWeek = computed(() => Array.from({ length: 7 }, (_, index) => {
  const date = new Date()
  date.setDate(date.getDate() - 6 + index)
  const isoDate = dateToIso(date)
  const count = events.value.filter((event) =>
    String(event.created_at || '').slice(0, 10) === isoDate,
  ).length

  return {
    date: isoDate,
    label: date.toLocaleDateString('en-US', { weekday: 'short' }),
    count,
  }
}))
const maxWeekCount = computed(() => Math.max(1, ...eventWeek.value.map((day) => day.count)))

function dateToIso(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getErrorMessage(err) {
  if (err.message?.startsWith('Eventlist API is not configured.')) {
    return err.message
  }

  if (err.response?.status === 429) {
    const retryAfter = Number(err.response.headers?.['retry-after'])
    if (Number.isFinite(retryAfter) && retryAfter > 0) {
      return `Too many password attempts. Please wait ${retryAfter} seconds before trying again.`
    }
    return 'Too many password attempts. Please wait a minute before trying again.'
  }

  if (err.response?.status === 422) {
    const errors = err.response.data.errors || {}
    return Object.values(errors).flat().join(' ')
      || 'Please check the information you entered.'
  }

  if (!err.response) {
    return 'Cannot connect to the server. Check your connection and try again.'
  }

  return err.response.data?.message || 'Something went wrong. Please try again.'
}

async function loadEvents() {
  loading.value = true
  error.value = ''

  try {
    events.value = await eventService.getAll()
  } catch (err) {
    if (err.response?.status === 401) {
      authService.clearToken()
      user.value = null
      events.value = []
      authError.value = 'Your session expired. Please sign in again.'
      return
    }

    error.value = getErrorMessage(err)
  } finally {
    loading.value = false
  }
}

async function loadPublicEvents() {
  if (publicLoading.value) return

  publicLoading.value = true
  publicError.value = ''

  try {
    publicEvents.value = await eventService.getPublic()
  } catch (err) {
    publicError.value = getErrorMessage(err)
  } finally {
    publicLoading.value = false
  }
}

function shouldRefreshPublicEvents() {
  return !user.value || user.value.role === 'user'
}

function refreshPublicContentWhenVisible() {
  if (document.visibilityState === 'visible' && shouldRefreshPublicEvents()) {
    loadPublicEvents()
    loadPublicHeroSlides()
  }
}

function isNewAnnouncement(event) {
  if (!event.created_at) return false

  const createdAt = new Date(event.created_at).getTime()
  const age = Date.now() - createdAt

  return Number.isFinite(createdAt) && age >= 0 && age < 7 * 24 * 60 * 60 * 1000
}

function changePublicSlide(offset) {
  const slideCount = publicHeroSlides.value.length
  if (!slideCount) return
  activePublicSlide.value = (activePublicSlide.value + offset + slideCount) % slideCount
}

function slideLines(value) {
  return String(value || '').split('|').map((line) => line.trim()).filter(Boolean)
}

function pausePublicHero() {
  isPublicHeroPaused.value = true
  window.clearInterval(publicHeroTimer)
}

function resumePublicHero() {
  isPublicHeroPaused.value = false
  window.clearInterval(publicHeroTimer)

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    publicHeroTimer = window.setInterval(() => changePublicSlide(1), 6500)
  }
}

async function loadPublicHeroSlides() {
  try {
    heroSlides.value = await heroSlideService.getPublic()
    heroSlidesLoaded.value = true
    if (activePublicSlide.value >= publicHeroSlides.value.length) activePublicSlide.value = 0
  } catch (err) {
    slideError.value = getErrorMessage(err)
  }
}

async function loadManagedHeroSlides() {
  slideLoading.value = true
  slideError.value = ''

  try {
    managedHeroSlides.value = await heroSlideService.getAll()
  } catch (err) {
    slideError.value = getErrorMessage(err)
  } finally {
    slideLoading.value = false
  }
}

async function loadAdmins() {
  if (user.value?.role !== 'owner') {
    admins.value = []
    return
  }

  adminLoading.value = true
  adminError.value = ''

  try {
    admins.value = await adminService.getAll()
  } catch (err) {
    adminError.value = getErrorMessage(err)
  } finally {
    adminLoading.value = false
  }
}

function openForgotPassword() {
  forgotPasswordEmail.value = authForm.email
  forgotPasswordError.value = ''
  forgotPasswordSuccess.value = ''
  forgotPasswordOpen.value = true
}

function closeForgotPassword() {
  if (!forgotPasswordLoading.value) {
    forgotPasswordOpen.value = false
  }
}

async function submitForgotPassword() {
  forgotPasswordLoading.value = true
  forgotPasswordError.value = ''
  forgotPasswordSuccess.value = ''

  try {
    const response = await authService.forgotPassword(forgotPasswordEmail.value)
    forgotPasswordSuccess.value = response.message
  } catch (err) {
    forgotPasswordError.value = getErrorMessage(err)
  } finally {
    forgotPasswordLoading.value = false
  }
}

function closeResetPassword() {
  resetPasswordOpen.value = false
  resetPasswordError.value = ''
  const url = new URL(window.location.href)
  url.searchParams.delete('reset_token')
  url.searchParams.delete('email')
  window.history.replaceState({}, '', url.pathname + url.hash)
}

async function submitResetPassword() {
  resetPasswordLoading.value = true
  resetPasswordError.value = ''
  resetPasswordSuccess.value = ''

  try {
    const response = await authService.resetPassword({
      email: resetPasswordEmail.value,
      token: resetPasswordToken.value,
      password: resetPasswordForm.password,
      password_confirmation: resetPasswordForm.password_confirmation,
    })
    resetPasswordSuccess.value = response.message
    resetPasswordForm.password = ''
    resetPasswordForm.password_confirmation = ''
  } catch (err) {
    resetPasswordError.value = getErrorMessage(err)
  } finally {
    resetPasswordLoading.value = false
  }
}

async function submitAuth() {
  signingIn.value = true
  authError.value = ''
  authSuccess.value = ''
  const creatingAccount = authMode.value === 'register'

  try {
    const response = creatingAccount
      ? await authService.register({ ...authForm })
      : await authService.login({
          email: authForm.email,
          password: authForm.password,
        })

    authService.setToken(response.token)
    user.value = response.user
    restorePortalPage()
    authForm.password = ''
    authForm.password_confirmation = ''
    authSuccess.value = creatingAccount ? 'Your account is ready. Welcome to Eventlist!' : ''

    if (user.value.role === 'owner' || user.value.role === 'admin') {
      await Promise.all([loadEvents(), loadAdmins(), loadPublicHeroSlides(), loadManagedHeroSlides()])
    } else {
      events.value = []
      admins.value = []
      await Promise.all([loadPublicEvents(), loadPublicHeroSlides()])
    }
  } catch (err) {
    authError.value = getErrorMessage(err)
  } finally {
    signingIn.value = false
  }
}

async function signOut() {
  profileMenuOpen.value = false

  try {
    await authService.logout()
    authService.clearToken()
    user.value = null
    events.value = []
    admins.value = []
    managedHeroSlides.value = []
    authForm.password = ''
    authForm.password_confirmation = ''
    setAuthMode('login')
    await loadPublicEvents()
  } catch (err) {
    if (err.response?.status === 401) {
      authService.clearToken()
      user.value = null
      events.value = []
      admins.value = []
      managedHeroSlides.value = []
      authForm.password = ''
      authForm.password_confirmation = ''
      setAuthMode('login')
      await loadPublicEvents()
      return
    }

    error.value = getErrorMessage(err)
  }
}

async function initializeSession() {
  if (authService.getToken()) {
    try {
      user.value = await authService.currentUser()
      restorePortalPage()
      if (user.value.role === 'owner' || user.value.role === 'admin') {
        await Promise.all([loadEvents(), loadAdmins(), loadPublicHeroSlides(), loadManagedHeroSlides()])
      } else {
        await Promise.all([loadPublicEvents(), loadPublicHeroSlides()])
      }
    } catch (err) {
      authService.clearToken()
      if (err.response?.status !== 401) {
        authError.value = getErrorMessage(err)
      }
      await Promise.all([loadPublicEvents(), loadPublicHeroSlides()])
    }
  } else {
    await Promise.all([loadPublicEvents(), loadPublicHeroSlides()])
  }

  sessionLoading.value = false
}

function setAuthMode(mode) {
  authMode.value = mode
  authError.value = ''
  authSuccess.value = ''
}

function resetSlideForm() {
  editingSlideId.value = null
  Object.assign(slideForm, {
    eyebrow: '',
    title: '',
    description: '',
    art_text: '',
    symbol: '✦',
    sort_order: managedHeroSlides.value.length,
    is_active: true,
  })
}

function openCreateSlideForm() {
  resetSlideForm()
  slideEditorOpen.value = true
  slideError.value = ''
  slideSuccess.value = ''
}

function editHeroSlide(slide) {
  editingSlideId.value = slide.id
  Object.assign(slideForm, {
    eyebrow: slide.eyebrow,
    title: slide.title,
    description: slide.description,
    art_text: slide.art_text,
    symbol: slide.symbol,
    sort_order: slide.sort_order,
    is_active: slide.is_active,
  })
  slideEditorOpen.value = true
  slideError.value = ''
  slideSuccess.value = ''
  scrollToSection('hero-slides')
}

function closeSlideForm() {
  slideEditorOpen.value = false
  resetSlideForm()
}

async function saveHeroSlide() {
  slideSaving.value = true
  slideError.value = ''
  slideSuccess.value = ''

  try {
    const savedSlide = editingSlideId.value
      ? await heroSlideService.update(editingSlideId.value, { ...slideForm })
      : await heroSlideService.create({ ...slideForm })
    const existingIndex = managedHeroSlides.value.findIndex((slide) => slide.id === savedSlide.id)

    if (existingIndex < 0) {
      managedHeroSlides.value = [...managedHeroSlides.value, savedSlide]
    } else {
      managedHeroSlides.value.splice(existingIndex, 1, savedSlide)
    }

    managedHeroSlides.value.sort((left, right) => left.sort_order - right.sort_order || left.id - right.id)
    slideSuccess.value = `“${savedSlide.eyebrow}” ${editingSlideId.value ? 'updated' : 'created'} successfully.`
    await loadPublicHeroSlides()
    closeSlideForm()
  } catch (err) {
    slideError.value = getErrorMessage(err)
  } finally {
    slideSaving.value = false
  }
}

async function toggleHeroSlide(slide) {
  slideError.value = ''
  slideSuccess.value = ''

  try {
    const updated = await heroSlideService.update(slide.id, { ...slide, is_active: !slide.is_active })
    const index = managedHeroSlides.value.findIndex((item) => item.id === slide.id)
    if (index >= 0) managedHeroSlides.value.splice(index, 1, updated)
    slideSuccess.value = `${updated.eyebrow} is now ${updated.is_active ? 'visible' : 'hidden'} on the public homepage.`
    await loadPublicHeroSlides()
  } catch (err) {
    slideError.value = getErrorMessage(err)
  }
}

async function deleteHeroSlide(slide) {
  if (!window.confirm(`Delete “${slide.eyebrow}” from the public carousel?`)) return

  slideDeleteBusy.value = slide.id
  slideError.value = ''
  slideSuccess.value = ''

  try {
    await heroSlideService.delete(slide.id)
    managedHeroSlides.value = managedHeroSlides.value.filter((item) => item.id !== slide.id)
    slideSuccess.value = 'Homepage slide deleted.'
    if (editingSlideId.value === slide.id) closeSlideForm()
    await loadPublicHeroSlides()
  } catch (err) {
    slideError.value = getErrorMessage(err)
  } finally {
    slideDeleteBusy.value = null
  }
}

function openCreateForm() {
  editingEvent.value = null
  showForm.value = true
  error.value = ''
  formError.value = ''
  navigateToPage('create-event')
}

function openEditForm(event) {
  editingEvent.value = { ...event }
  showForm.value = true
  error.value = ''
  formError.value = ''
  navigateToPage('create-event')
}

function cancelEventForm() {
  showForm.value = false
  editingEvent.value = null
  formError.value = ''
  navigateToPage('events')
}

async function openEventDetails(event, trigger) {
  eventDetailsTrigger.value = trigger
  selectedEventDetails.value = event
  await nextTick()
  eventDetailsCloseButton.value?.focus()
}

function hasPreciseEventLocation(event) {
  return event?.latitude !== null && event?.latitude !== undefined
    && event?.longitude !== null && event?.longitude !== undefined
    && Number.isFinite(Number(event.latitude)) && Number.isFinite(Number(event.longitude))
}

function getEventDirectionsUrl(event) {
  const destination = hasPreciseEventLocation(event)
    ? `${event.latitude},${event.longitude}`
    : event.location
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}

function closeEventDetails() {
  const trigger = eventDetailsTrigger.value
  selectedEventDetails.value = null
  eventDetailsTrigger.value = null
  nextTick(() => trigger?.focus())
}

function editEventFromDetails() {
  const event = selectedEventDetails.value
  closeEventDetails()
  if (event) openEditForm(event)
}

async function saveEvent(formData) {
  if (saving.value) return

  saving.value = true
  formError.value = ''

  try {
    if (editingEvent.value) {
      await eventService.update(editingEvent.value.id, formData)
    } else {
      await eventService.create(formData)
    }

    showForm.value = false
    editingEvent.value = null
    formError.value = ''
    navigateToPage('events')
    await loadEvents()
  } catch (err) {
    formError.value = getErrorMessage(err)
  } finally {
    saving.value = false
  }
}

async function deleteEvent(event) {
  if (!window.confirm(`Delete "${event.title}"? This cannot be undone.`)) {
    return
  }

  error.value = ''

  try {
    await eventService.delete(event.id)
    events.value = events.value.filter((item) => item.id !== event.id)
  } catch (err) {
    error.value = getErrorMessage(err)
  }
}

function exportEvents() {
  const headers = ['Title', 'Date', 'Time', 'Location', 'Organizer', 'Capacity', 'Description']
  const rows = filteredEvents.value.map((event) => [
    event.title,
    String(event.event_date).slice(0, 10),
    event.event_time || '',
    event.location,
    event.organizer || '',
    event.capacity,
    event.description || '',
  ])
  const csv = [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'eventlist-events.csv'
  link.click()
  URL.revokeObjectURL(url)
}

function changeMonth(offset) {
  const nextMonth = new Date(calendarMonth.value)
  nextMonth.setMonth(nextMonth.getMonth() + offset)
  calendarMonth.value = nextMonth
}

function selectCalendarDate(date) {
  selectedCalendarDate.value = selectedCalendarDate.value === date ? '' : date
  dateFilter.value = 'all'
  navigateToPage('events')
}

function scrollToSection(id) {
  const pageBySection = {
    home: 'dashboard',
    overview: 'analytics',
    events: 'events',
    calendar: 'calendar',
    'hero-slides': 'homepage',
    admins: 'administrators',
  }
  navigateToPage(pageBySection[id] || 'dashboard')
}

function navigateToPage(page) {
  if (!portalPages.includes(page) || (page === 'administrators' && user.value?.role !== 'owner')) {
    page = 'dashboard'
  }

  currentPage.value = page
  if (page !== 'create-event') {
    showForm.value = false
    editingEvent.value = null
  }

  if (page === 'administrators' && user.value?.role === 'owner') {
    loadAdmins()
  }

  if (window.location.hash !== `#${page}`) {
    window.history.pushState(null, '', `#${page}`)
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function restorePortalPage() {
  const requested = window.location.hash.slice(1)
  const page = portalPages.includes(requested) ? requested : 'dashboard'
  currentPage.value = page === 'administrators' && user.value?.role !== 'owner' ? 'dashboard' : page
  showForm.value = currentPage.value === 'create-event'
  if (!showForm.value) editingEvent.value = null
}

function formatDate(value, options = { year: 'numeric', month: 'short', day: 'numeric' }) {
  if (!value) return 'No date'

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)

  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-US', options)
}

function searchPublicByLocation(location) {
  publicSearch.value = location
  publicEventFilter.value = 'all'
  document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth' })
}

function formatTime(value) {
  if (!value) return 'Time not set'

  const [hours, minutes] = value.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)

  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function eventStatus(event) {
  const eventDate = String(event.event_date).slice(0, 10)
  return eventDate < today ? 'Completed' : eventDate === today ? 'Today' : 'Upcoming'
}

function openAdminModal() {
  adminModalOpen.value = true
  adminError.value = ''
  adminSuccess.value = ''
  loadAdmins()
}

function closeAdminModal() {
  adminModalOpen.value = false
  adminError.value = ''
  adminSuccess.value = ''
}

async function createAdmin() {
  adminSaving.value = true
  adminError.value = ''
  adminSuccess.value = ''

  try {
    const admin = await adminService.create({ ...adminForm })
    admins.value = [...admins.value, admin]
    adminSuccess.value = `${admin.name} can now sign in with the password you set. Share it with them securely.`
    adminForm.name = ''
    adminForm.email = ''
    adminForm.password = ''
    adminForm.password_confirmation = ''
  } catch (err) {
    adminError.value = getErrorMessage(err)
  } finally {
    adminSaving.value = false
  }
}

async function removeAdmin(admin) {
  if (!window.confirm(`Remove admin access for ${admin.name}? They will no longer be able to sign in.`)) {
    return
  }

  adminError.value = ''
  adminSuccess.value = ''

  try {
    await adminService.delete(admin.id)
    admins.value = admins.value.filter((item) => item.id !== admin.id)
    adminSuccess.value = `${admin.name} no longer has portal access.`
  } catch (err) {
    adminError.value = getErrorMessage(err)
  }
}

onMounted(() => {
  window.addEventListener('popstate', restorePortalPage)
  initializeSession()
  const resetParams = new URLSearchParams(window.location.search)
  resetPasswordToken.value = resetParams.get('reset_token') || ''
  resetPasswordEmail.value = resetParams.get('email') || ''
  resetPasswordOpen.value = Boolean(resetPasswordToken.value && resetPasswordEmail.value)
  resumePublicHero()
  publicEventsTimer = window.setInterval(() => {
    if (shouldRefreshPublicEvents()) {
      loadPublicEvents()
      loadPublicHeroSlides()
    }
  }, 30000)
  window.addEventListener('focus', refreshPublicContentWhenVisible)
  document.addEventListener('visibilitychange', refreshPublicContentWhenVisible)
})

onUnmounted(() => {
  window.removeEventListener('popstate', restorePortalPage)
  window.clearInterval(publicEventsTimer)
  window.clearInterval(publicHeroTimer)
  window.removeEventListener('focus', refreshPublicContentWhenVisible)
  document.removeEventListener('visibilitychange', refreshPublicContentWhenVisible)
})
</script>

<template>
  <div v-if="sessionLoading" class="session-loading" role="status">
    <span class="brand-mark">E</span>
    <span>Preparing your workspace…</span>
  </div>

  <main v-else-if="!user" class="auth-page">
    <section class="auth-story">
      <a class="auth-brand" href="/" aria-label="Eventlist home">
        <span class="brand-mark">E</span>
        <span>Eventlist</span>
      </a>
      <div class="auth-story-copy">
        <span class="story-kicker">GOOD THINGS HAPPEN TOGETHER</span>
        <h1>Find your next<br />great moment.</h1>
        <p>Discover local gatherings, keep up with what’s coming, and bring your own community together.</p>
        <div class="story-decoration" aria-hidden="true">
          <span class="decoration-orbit orbit-one"></span>
          <span class="decoration-orbit orbit-two"></span>
          <span class="decoration-calendar">28</span>
          <span class="decoration-spark">✦</span>
        </div>
      </div>
      <div class="guest-preview">
        <div class="guest-preview-heading">
          <strong>Coming up on Eventlist</strong>
          <span>{{ publicUpcomingEvents.length }} events</span>
        </div>
        <p v-if="publicLoading" class="guest-preview-empty">Finding events for you…</p>
        <p v-else-if="publicError" class="guest-preview-empty">{{ publicError }}</p>
        <p v-else-if="!publicUpcomingEvents.length" class="guest-preview-empty">New events will appear here soon.</p>
        <article v-for="event in publicUpcomingEvents.slice(0, 2)" :key="`guest-${event.id}`" class="guest-preview-event">
          <span class="guest-preview-date">{{ formatDate(event.event_date, { month: 'short', day: 'numeric' }) }}</span>
          <span><strong>{{ event.title }}</strong><small>{{ event.location }}</small></span>
          <span aria-hidden="true">→</span>
        </article>
      </div>
      <p class="auth-footnote">Plan better. Create greater.</p>
    </section>

    <section class="auth-panel">
      <div class="auth-card">
        <p class="eyebrow">WELCOME TO EVENTLIST</p>
        <h2>{{ authMode === 'register' ? 'Create your account' : 'Welcome back' }}</h2>
        <p class="auth-subtitle">
          {{ authMode === 'register' ? 'Join the community and find events worth showing up for.' : 'Sign in to discover events or continue to your workspace.' }}
        </p>

        <div v-if="authError" class="auth-error" role="alert">{{ authError }}</div>
        <div v-if="authSuccess" class="auth-success" role="status">{{ authSuccess }}</div>

        <form class="auth-form" @submit.prevent="submitAuth">
          <label v-if="authMode === 'register'" class="auth-field">
            <span>Your name</span>
            <input
              v-model.trim="authForm.name"
              type="text"
              autocomplete="name"
              maxlength="255"
              placeholder="Your full name"
              required
            />
          </label>

          <label class="auth-field">
            <span>Email address</span>
            <input
              v-model.trim="authForm.email"
              type="email"
              autocomplete="email"
              maxlength="255"
              placeholder="you@example.com"
              required
            />
          </label>

          <label class="auth-field">
            <span class="password-label-row">
              <span>Password</span>
              <button v-if="authMode === 'login'" class="forgot-password-link" type="button" @click="openForgotPassword">Forgot password?</button>
            </span>
            <span class="password-input-wrap">
              <input
                v-model="authForm.password"
                :type="passwordVisible ? 'text' : 'password'"
                :autocomplete="authMode === 'register' ? 'new-password' : 'current-password'"
                :minlength="authMode === 'register' ? 8 : undefined"
                placeholder="At least 8 characters"
                required
              />
              <button
                class="password-toggle"
                type="button"
                :aria-label="passwordVisible ? 'Hide password' : 'Show password'"
                :title="passwordVisible ? 'Hide password' : 'Show password'"
                @click="passwordVisible = !passwordVisible"
              >
                <svg v-if="passwordVisible" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.4 4.3A10.8 10.8 0 0112 4c5.5 0 9 4.8 9 8-0.2 1.3-0.9 2.7-1.9 3.8M6.2 6.2C4.2 7.6 3.1 9.6 3 12c0 3.2 3.5 8 9 8 1.2 0 2.4-0.2 3.4-0.7" /></svg>
                <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.5-8 9-8 9 8 9 8-3.5 8-9 8-9-8-9-8zM12 15a3 3 0 100-6 3 3 0 000 6z" /></svg>
              </button>
            </span>
          </label>

          <label v-if="authMode === 'register'" class="auth-field">
            <span>Confirm password</span>
            <span class="password-input-wrap">
              <input
                v-model="authForm.password_confirmation"
                :type="confirmationPasswordVisible ? 'text' : 'password'"
                autocomplete="new-password"
                minlength="8"
                placeholder="Enter your password again"
                required
              />
              <button
                class="password-toggle"
                type="button"
                :aria-label="confirmationPasswordVisible ? 'Hide password confirmation' : 'Show password confirmation'"
                @click="confirmationPasswordVisible = !confirmationPasswordVisible"
              >
                <svg v-if="confirmationPasswordVisible" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.4 4.3A10.8 10.8 0 0112 4c5.5 0 9 4.8 9 8-.2 1.3-.9 2.7-1.9 3.8M6.2 6.2C4.2 7.6 3.1 9.6 3 12c0 3.2 3.5 8 9 8 1.2 0 2.4-.2 3.4-.7" /></svg>
                <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.5-8 9-8 9 8 9 8-3.5 8-9 8-9-8-9-8zM12 15a3 3 0 100-6 3 3 0 000 6z" /></svg>
              </button>
            </span>
          </label>

          <button class="auth-submit" type="submit" :disabled="signingIn">
            {{ signingIn ? (authMode === 'register' ? 'Creating account…' : 'Signing in…') : (authMode === 'register' ? 'Create account' : 'Sign in') }}
            <span aria-hidden="true">→</span>
          </button>
        </form>

        <p class="auth-switch">
          {{ authMode === 'register' ? 'Already have an account?' : 'New to Eventlist?' }}
          <button type="button" @click="setAuthMode(authMode === 'register' ? 'login' : 'register')">
            {{ authMode === 'register' ? 'Sign in' : 'Create an account' }}
          </button>
        </p>
        <a class="auth-mobile-app" href="/eventlist-app-debug.apk" download="Eventlist-app-debug.apk">
          <span aria-hidden="true">↓</span>
          <span><small>AVAILABLE ON</small><strong>Android APK</strong></span>
        </a>
        <p class="auth-admin-note">Administrators use this same sign-in. Only owner-created admin accounts can open the management dashboard.</p>
      </div>
      <p class="auth-legal">By joining, you agree to use Eventlist respectfully and keep your account secure.</p>
    </section>
  </main>

  <main v-else-if="user.role === 'user'" class="public-home">
    <header class="public-topbar">
      <a class="public-brand" href="#discover"><span class="brand-mark">E</span><span>Eventlist</span></a>
      <nav aria-label="Public navigation">
        <a href="#discover">Discover</a>
        <a href="#upcoming">Upcoming</a>
        <a href="#venues">Venues</a>
        <a href="#about">About</a>
        <a class="public-mobile-link" href="/eventlist-app-debug.apk" download="Eventlist-app-debug.apk">Get the app <span aria-hidden="true">↓</span></a>
        <div class="profile-menu">
          <button
            class="profile-trigger public-profile-trigger"
            type="button"
            :aria-expanded="profileMenuOpen"
            aria-haspopup="menu"
            aria-label="Open profile menu"
            @click="profileMenuOpen = !profileMenuOpen"
          >
            <span class="avatar avatar-small">{{ user.name?.slice(0, 1).toUpperCase() }}</span>
            <span class="account-name"><strong>{{ user.name }}</strong><small>Eventlist member</small></span>
            <span class="profile-chevron" aria-hidden="true">⌄</span>
          </button>
          <div v-if="profileMenuOpen" class="profile-dropdown" role="menu">
            <div class="profile-dropdown-user">
              <strong>{{ user.name }}</strong>
              <small>{{ user.email }}</small>
            </div>
            <button type="button" role="menuitem" @click="signOut">
              <span aria-hidden="true">↗</span> Sign out
            </button>
          </div>
        </div>
      </nav>
    </header>

    <section
      v-if="publicHeroSlides.length"
      class="public-hero"
      aria-label="Eventlist highlights"
      @mouseenter="pausePublicHero"
      @mouseleave="resumePublicHero"
      @focusin="pausePublicHero"
      @focusout="resumePublicHero"
      @keydown.left.prevent="changePublicSlide(-1)"
      @keydown.right.prevent="changePublicSlide(1)"
      tabindex="0"
    >
      <Transition name="hero-slide" mode="out-in">
        <div :key="activePublicSlide" class="public-hero-slide" aria-live="polite">
          <div class="public-hero-copy">
            <span class="story-kicker">{{ publicHeroSlides[activePublicSlide].kicker }}</span>
            <h1>
              <template v-for="(line, index) in publicHeroSlides[activePublicSlide].title" :key="line">
                {{ line }}<br v-if="index < publicHeroSlides[activePublicSlide].title.length - 1" />
              </template>
            </h1>
            <p>{{ publicHeroSlides[activePublicSlide].description }}</p>
            <a class="public-hero-button" href="#discover">Explore events <span aria-hidden="true">↓</span></a>
          </div>
          <div class="public-hero-art" aria-hidden="true">
            <span>{{ publicHeroSlides[activePublicSlide].symbol }}</span>
            <strong><template v-for="(line, index) in publicHeroSlides[activePublicSlide].art" :key="line">{{ line }}<br v-if="index < publicHeroSlides[activePublicSlide].art.length - 1" /></template></strong>
            <i>✳</i>
          </div>
        </div>
      </Transition>
      <div class="public-hero-controls">
        <div class="public-hero-dots" aria-label="Choose a highlight">
          <button
            v-for="(slide, index) in publicHeroSlides"
            :key="slide.kicker"
            type="button"
            :class="{ active: activePublicSlide === index }"
            :aria-label="`Show highlight ${index + 1}`"
            :aria-current="activePublicSlide === index ? 'true' : undefined"
            @click="activePublicSlide = index"
          ></button>
        </div>
      </div>
    </section>

    <section class="public-quick-stats" aria-label="Eventlist community statistics">
      <div><span>01</span><p><strong>{{ publicUpcomingEvents.length }}</strong> upcoming events</p></div>
      <div><span>02</span><p><strong>{{ publicVenueCount }}</strong> community venues</p></div>
      <div><span>03</span><p><strong>{{ publicEvents.length }}</strong> events in the calendar</p></div>
      <a href="#discover">View the calendar <b aria-hidden="true">→</b></a>
    </section>

    <section class="public-app-banner" aria-label="Download the Eventlist Android app">
      <div class="public-app-copy">
        <span class="public-app-kicker">EVENTLIST ON ANDROID</span>
        <h2>Take every event with you.</h2>
        <p>Discover upcoming gatherings, browse community venues, and keep Eventlist close wherever your plans take you.</p>
        <a href="/eventlist-app-debug.apk" download="Eventlist-app-debug.apk">
          <span class="android-download-icon" aria-hidden="true">↓</span>
          <span><small>DOWNLOAD FOR</small><strong>Android APK</strong></span>
          <b aria-hidden="true">→</b>
        </a>
        <small class="public-app-note">Android 7.0 or newer · Free app · 4.2 MB</small>
      </div>
      <div class="public-phone-mockup" aria-hidden="true">
        <div class="public-phone-speaker"></div>
        <div class="public-phone-screen">
          <div class="phone-status"><span>9:41</span><span>● ◔</span></div>
          <div class="phone-brand"><span>E</span><strong>Eventlist</strong></div>
          <div class="phone-card-art"><span>✦</span><strong>Make<br />it a<br />moment.</strong></div>
          <div class="phone-feature">
            <span>UPCOMING</span>
            <strong>Discover your next event</strong>
            <small>Explore the community calendar →</small>
          </div>
        </div>
      </div>
    </section>

    <section id="upcoming" class="public-featured-section">
      <div class="public-featured-heading">
        <div><p class="eyebrow">DON'T MISS OUT</p><h2>Featured upcoming events</h2></div>
        <a href="#discover" @click="publicEventFilter = 'upcoming'">Browse all upcoming <span aria-hidden="true">→</span></a>
      </div>
      <div v-if="featuredPublicEvents.length" class="public-featured-grid">
        <article
          v-for="event in featuredPublicEvents"
          :key="`featured-${event.id}`"
          class="public-featured-card"
          role="button"
          tabindex="0"
          @click="openEventDetails(event, $event.currentTarget)"
          @keydown.enter.prevent="openEventDetails(event, $event.currentTarget)"
        >
          <div class="public-featured-date">
            <strong>{{ formatDate(event.event_date, { day: 'numeric' }) }}</strong>
            <span>{{ formatDate(event.event_date, { month: 'short' }) }}</span>
          </div>
          <div>
            <span>{{ event.location }}</span>
            <h3>{{ event.title }}</h3>
            <p>{{ formatTime(event.event_time) }} · {{ event.organizer || 'Community organizer' }}</p>
          </div>
        </article>
      </div>
      <p v-else class="public-featured-empty">Upcoming events will appear here as soon as they are announced.</p>
    </section>

    <section id="discover" class="public-events-section">
      <div class="public-section-heading">
        <div>
          <p class="eyebrow">THE COMMUNITY CALENDAR</p>
          <h2>Discover events</h2>
          <p>Explore every upcoming and past event shared by your community.</p>
          <div class="public-event-summary" aria-label="Event totals">
            <span><strong>{{ publicEvents.length }}</strong> all events</span>
            <span><strong>{{ publicUpcomingEvents.length }}</strong> upcoming</span>
            <span><strong>{{ publicPastEvents.length }}</strong> past</span>
          </div>
        </div>
        <label class="public-search"><span aria-hidden="true">⌕</span><input v-model="publicSearch" type="search" placeholder="Search events or places" aria-label="Search public events" /></label>
      </div>

      <div v-if="authSuccess" class="auth-success" role="status">{{ authSuccess }}</div>
      <div class="public-event-filters" role="group" aria-label="Filter events by date">
        <button type="button" :class="{ selected: publicEventFilter === 'all' }" @click="publicEventFilter = 'all'">All events <span>{{ publicEvents.length }}</span></button>
        <button type="button" :class="{ selected: publicEventFilter === 'upcoming' }" @click="publicEventFilter = 'upcoming'">Upcoming <span>{{ publicUpcomingEvents.length }}</span></button>
        <button type="button" :class="{ selected: publicEventFilter === 'past' }" @click="publicEventFilter = 'past'">Past <span>{{ publicPastEvents.length }}</span></button>
      </div>
      <div v-if="publicError" class="public-empty" role="alert"><p>{{ publicError }}</p><button type="button" @click="loadPublicEvents">Try again</button></div>
      <div v-else-if="publicLoading" class="public-empty" role="status"><span class="loading-mark"></span><p>Loading community events…</p></div>
      <div v-else-if="!visiblePublicEvents.length" class="public-empty">
        <span aria-hidden="true">✦</span>
        <h3>{{ publicSearch ? 'No events match that search' : 'New events are on the way' }}</h3>
        <p>{{ publicSearch ? 'Try another event name, organizer, or location.' : 'Check back soon to see what the community is planning.' }}</p>
      </div>
      <div v-else class="public-event-grid">
        <article
          v-for="event in visiblePublicEvents"
          :key="`public-${event.id}`"
          class="public-event-card"
          role="button"
          tabindex="0"
          :aria-label="`View details for ${event.title}`"
          @click="openEventDetails(event, $event.currentTarget)"
          @keydown.enter.prevent="openEventDetails(event, $event.currentTarget)"
          @keydown.space.prevent="openEventDetails(event, $event.currentTarget)"
        >
          <div class="public-event-art" :class="{ 'has-cover': event.image_url }">
            <img v-if="event.image_url" class="public-event-cover" :src="event.image_url" :alt="`${event.title} event cover`" />
            <span class="public-event-date">{{ formatDate(event.event_date, { month: 'short', day: 'numeric' }) }}</span>
            <span v-if="!event.image_url" aria-hidden="true">✦</span>
          </div>
          <div class="public-event-body">
            <span class="public-event-tag" :class="{ 'new-announcement': isNewAnnouncement(event) }">
              {{ isNewAnnouncement(event) ? 'New announcement' : eventStatus(event) }}
            </span>
            <h3>{{ event.title }}</h3>
            <p>{{ event.description || 'A new opportunity to connect with your community.' }}</p>
            <div class="public-event-meta">
              <span>⌖ {{ event.location }}</span>
              <span>◷ {{ formatTime(event.event_time) }}</span>
              <span v-if="event.organizer">♙ {{ event.organizer }}</span>
              <span v-if="event.capacity !== null && event.capacity !== undefined">＋ {{ Number(event.capacity).toLocaleString() }} spaces</span>
            </div>
            <span class="public-event-details-link">View event details <span aria-hidden="true">→</span></span>
          </div>
        </article>
      </div>
    </section>

    <section id="venues" class="public-venues-section">
      <div>
        <p class="eyebrow">EXPLORE BY PLACE</p>
        <h2>Find an event near you</h2>
      </div>
      <div v-if="publicLocations.length" class="public-location-list" aria-label="Event locations">
        <button
          v-for="location in publicLocations"
          :key="location"
          type="button"
          @click="searchPublicByLocation(location)"
        >
          <span>⌖</span><strong>{{ location }}</strong><b aria-hidden="true">→</b>
        </button>
      </div>
      <p v-else class="public-featured-empty">Event locations will appear as the calendar grows.</p>
    </section>

    <footer id="about" class="public-footer">
      <div class="public-footer-brand">
        <strong><span class="brand-mark">E</span> Eventlist</strong>
        <p>One community calendar for discovering meaningful events, meeting people, and making plans.</p>
      </div>
      <nav aria-label="Footer navigation">
        <p>Explore</p>
        <a href="#discover">All events</a>
        <a href="#upcoming">Upcoming</a>
        <a href="#venues">Venues</a>
        <a href="/eventlist-app-debug.apk" download="Eventlist-app-debug.apk">Download Android app</a>
      </nav>
      <nav aria-label="Account navigation">
        <p>Account</p>
        <button type="button" @click="profileMenuOpen = true">Profile</button>
        <button type="button" @click="signOut">Sign out</button>
      </nav>
      <div class="public-footer-bottom"><span>© {{ currentYear }} Eventlist</span><span>Better events. Bigger connections.</span></div>
    </footer>
  </main>

  <div v-else-if="user.role === 'owner' || user.role === 'admin'" class="app-shell">
    <aside class="sidebar">
      <a class="sidebar-brand" href="#" aria-label="Eventlist home">
        <span class="brand-mark">E</span>
        <span>Eventlist</span>
      </a>

      <nav class="side-nav" aria-label="Main navigation">
        <button class="nav-link" :class="{ active: currentPage === 'dashboard' }" type="button" :aria-current="currentPage === 'dashboard' ? 'page' : undefined" @click="navigateToPage('dashboard')"><span>⌂</span>Dashboard</button>
        <button class="nav-link" :class="{ active: currentPage === 'events' }" type="button" :aria-current="currentPage === 'events' ? 'page' : undefined" @click="navigateToPage('events')"><span>▤</span>Events</button>
        <button class="nav-link" :class="{ active: currentPage === 'create-event' }" type="button" :aria-current="currentPage === 'create-event' ? 'page' : undefined" @click="openCreateForm"><span>＋</span>Create Event</button>
        <button class="nav-link" :class="{ active: currentPage === 'calendar' }" type="button" :aria-current="currentPage === 'calendar' ? 'page' : undefined" @click="navigateToPage('calendar')"><span>▦</span>Calendar</button>
        <button class="nav-link" :class="{ active: currentPage === 'analytics' }" type="button" :aria-current="currentPage === 'analytics' ? 'page' : undefined" @click="navigateToPage('analytics')"><span>▥</span>Analytics</button>
        <button class="nav-link" :class="{ active: currentPage === 'homepage' }" type="button" :aria-current="currentPage === 'homepage' ? 'page' : undefined" @click="navigateToPage('homepage')"><span>✦</span>Homepage</button>
        <button v-if="user.role === 'owner'" class="nav-link" :class="{ active: currentPage === 'administrators' }" type="button" :aria-current="currentPage === 'administrators' ? 'page' : undefined" @click="navigateToPage('administrators')"><span>♙</span>Administrators</button>
      </nav>

      <div class="sidebar-note">
        <span class="sidebar-note-icon">✳</span>
        <strong>Plan better,<br />create greater.</strong>
        <p>Make every gathering feel thoughtful, welcoming, and worth remembering.</p>
        <span class="note-leaf" aria-hidden="true">✦</span>
      </div>

      <div class="sidebar-footer">
        <span class="avatar">{{ user.name?.slice(0, 1).toUpperCase() }}</span>
        <span class="sidebar-user">
          <strong>{{ user.name }}</strong>
          <small>Organizer</small>
        </span>
      </div>
    </aside>

    <div class="workspace">
      <header class="topbar">
        <label class="top-search">
          <span aria-hidden="true">⌕</span>
          <input
            v-model="search"
            type="search"
            placeholder="Search events, locations, or organizers…"
            aria-label="Search events, locations, or organizers"
          />
        </label>
        <div class="topbar-account">
          <span class="workspace-status"><i></i> ADMIN PORTAL</span>
          <div class="profile-menu">
            <button
              class="profile-trigger"
              type="button"
              :aria-expanded="profileMenuOpen"
              aria-haspopup="menu"
              aria-label="Open profile menu"
              @click="profileMenuOpen = !profileMenuOpen"
            >
              <span class="avatar avatar-small">{{ user.name?.slice(0, 1).toUpperCase() }}</span>
              <span class="account-name"><strong>{{ user.name }}</strong><small>{{ user.role === 'owner' ? 'Portal owner' : 'Administrator' }}</small></span>
              <span class="profile-chevron" aria-hidden="true">⌄</span>
            </button>
            <div v-if="profileMenuOpen" class="profile-dropdown" role="menu">
              <div class="profile-dropdown-user">
                <strong>{{ user.name }}</strong>
                <small>{{ user.email }}</small>
              </div>
              <button type="button" role="menuitem" @click="signOut">
                <span aria-hidden="true">↗</span> Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main id="home" class="dashboard" :class="{ 'single-page': currentPage !== 'dashboard' }">
        <section v-if="currentPage === 'dashboard'" class="hero-banner">
          <div class="hero-content">
            <p class="hero-kicker">EVENTLIST ADMIN PORTAL</p>
            <h1>Welcome back, {{ user.name }} <span aria-hidden="true">✦</span></h1>
            <p>Here’s what’s happening with your events today.</p>
            <div class="hero-metrics">
              <div><span class="metric-icon">▦</span><strong>{{ events.length }}</strong><small>Total events</small></div>
              <div><span class="metric-icon">♙</span><strong>{{ upcomingCount }}</strong><small>Upcoming events</small></div>
              <div><span class="metric-icon">↗</span><strong>{{ totalCapacity.toLocaleString() }}</strong><small>Total capacity</small></div>
            </div>
          </div>
          <button class="hero-create" type="button" @click="openCreateForm"><span>＋</span> Create New Event <b>›</b></button>
          <div class="hero-glow" aria-hidden="true"></div>
        </section>

        <header v-if="currentPage !== 'dashboard'" class="admin-page-heading">
          <div>
            <p class="eyebrow">EVENTLIST WORKSPACE</p>
            <h1>{{ portalPageContent.title }}</h1>
            <p>{{ portalPageContent.description }}</p>
          </div>
          <button v-if="currentPage === 'events'" class="admin-page-primary" type="button" @click="openCreateForm">＋ Create event</button>
          <button v-else-if="currentPage === 'administrators' && user.role === 'owner'" class="admin-page-primary" type="button" @click="openAdminModal">＋ Manage access</button>
          <button v-else-if="currentPage === 'homepage'" class="admin-page-primary" type="button" @click="openCreateSlideForm">＋ Add homepage slide</button>
        </header>

        <div v-if="error" class="error-message full-width" role="alert">
          <p>{{ error }}</p>
          <button type="button" @click="loadEvents">Retry</button>
        </div>

        <section v-if="currentPage === 'create-event' && showForm" class="form-panel full-width">
          <EventForm
            :initial-event="editingEvent"
            :loading="saving"
            :error="formError"
            @submit="saveEvent"
            @cancel="cancelEventForm"
          />
          <button class="form-back-link" type="button" @click="cancelEventForm">← Back to events</button>
        </section>

        <section v-if="currentPage === 'dashboard' || currentPage === 'analytics'" id="overview" class="panel analytics-panel" :class="{ 'analytics-page-panel': currentPage === 'analytics' }">
          <div class="panel-heading">
            <div><h2>Event Schedule Overview</h2><p>Events created in the last seven days</p></div>
            <span class="live-badge"><i></i> LIVE DATA</span>
          </div>
          <div class="chart-bars" role="img" aria-label="Daily events created during the last seven days">
            <div v-for="day in eventWeek" :key="day.date" class="chart-column">
              <strong>{{ day.count }}</strong>
              <div class="chart-track"><i :style="{ height: `${Math.max(4, day.count / maxWeekCount * 100)}%` }"></i></div>
              <small>{{ day.label }}</small>
            </div>
          </div>
          <div class="analytics-summary">
            <div><span class="analytics-icon">♙</span><p>Upcoming events<strong>{{ upcomingCount }}</strong></p></div>
            <div><span class="analytics-icon">▦</span><p>Available capacity<strong>{{ totalCapacity.toLocaleString() }}</strong></p></div>
          </div>
        </section>

        <section v-if="currentPage === 'dashboard'" class="panel upcoming-panel">
          <div class="panel-heading">
            <div><h2>Upcoming Events</h2><p>Your next scheduled events</p></div>
            <button type="button" class="text-action" @click="dateFilter = 'upcoming'; selectedCalendarDate = ''; navigateToPage('events')">View all →</button>
          </div>
          <div v-if="!upcomingEvents.length" class="widget-empty">No upcoming events yet.</div>
          <button
            v-for="event in upcomingEvents.slice(0, 5)"
            :key="`upcoming-${event.id}`"
            type="button"
            class="upcoming-row"
            @click="openEventDetails(event, $event.currentTarget)"
          >
            <span class="upcoming-date"><b>{{ new Date(`${String(event.event_date).slice(0, 10)}T00:00:00`).getDate() }}</b><small>{{ formatDate(event.event_date, { month: 'short' }) }}</small></span>
            <span class="upcoming-info"><strong>{{ event.title }}</strong><small>{{ formatTime(event.event_time) }} · {{ event.location }}</small></span>
            <span class="event-status" :class="eventStatus(event).toLowerCase()">{{ eventStatus(event) }}</span>
          </button>
        </section>

        <aside v-if="currentPage === 'dashboard'" class="dashboard-rail">
          <section class="panel quick-actions">
            <div class="panel-heading"><div><h2>Quick Actions</h2><p>Common portal tasks</p></div></div>
            <div class="quick-list">
              <button type="button" class="quick-primary" @click="openCreateForm"><span>＋</span>Create new event</button>
              <button type="button" @click="navigateToPage('events')"><span>▤</span>Manage events</button>
              <button type="button" @click="navigateToPage('calendar')"><span>▦</span>View calendar</button>
              <button type="button" @click="navigateToPage('homepage')"><span>✦</span>Edit homepage</button>
              <button v-if="user.role === 'owner'" type="button" @click="navigateToPage('administrators')"><span>♙</span>Manage administrators</button>
              <button type="button" :disabled="!events.length" @click="exportEvents"><span>⇩</span>Export event report</button>
            </div>
          </section>

          <section id="calendar" class="calendar-panel panel">
            <div class="calendar-heading">
              <h2>{{ calendarTitle }}</h2>
              <div>
                <button type="button" aria-label="Previous month" @click="changeMonth(-1)">‹</button>
                <button type="button" aria-label="Next month" @click="changeMonth(1)">›</button>
              </div>
            </div>
            <div class="calendar-grid calendar-weekdays">
              <span v-for="(day, index) in ['S', 'M', 'T', 'W', 'T', 'F', 'S']" :key="index">{{ day }}</span>
            </div>
            <div class="calendar-grid calendar-dates">
              <span v-for="(day, index) in calendarDays" :key="day?.isoDate || `empty-${index}`">
                <button
                  v-if="day"
                  type="button"
                  :class="{ today: day.isToday, 'has-event': day.hasEvent, picked: selectedCalendarDate === day.isoDate }"
                  :aria-label="`${formatDate(day.isoDate)}, ${day.hasEvent ? 'has events' : 'no events'}`"
                  @click="selectCalendarDate(day.isoDate)"
                >{{ day.day }}<i v-if="day.hasEvent"></i></button>
              </span>
            </div>
            <p class="calendar-hint"><span></span> Event scheduled <button v-if="selectedCalendarDate" type="button" @click="selectedCalendarDate = ''">Clear date</button></p>
          </section>

          <section v-if="user.role === 'owner'" id="admins" class="panel admin-panel">
            <div class="panel-heading"><div><h2>Administrators</h2><p>Owner-managed portal access</p></div><span class="admin-count">{{ admins.length }}</span></div>
            <div v-if="adminLoading" class="widget-empty">Loading accounts…</div>
            <div v-else-if="adminError" class="widget-error">{{ adminError }}</div>
            <div v-else-if="!admins.length" class="widget-empty">No administrator accounts found.</div>
            <div v-for="admin in admins.slice(0, 3)" :key="admin.id" class="admin-row">
              <span class="avatar admin-avatar">{{ admin.name.slice(0, 1).toUpperCase() }}</span>
              <span><strong>{{ admin.name }}</strong><small>{{ admin.role === 'owner' ? 'Portal owner' : admin.email }}</small></span>
              <i :class="{ inactive: !admin.is_active }"></i>
            </div>
            <button class="manage-admins-btn" type="button" @click="openAdminModal">Manage administrator access</button>
          </section>
        </aside>

        <section v-if="currentPage === 'calendar'" class="calendar-page panel">
          <div class="calendar-page-heading">
            <div>
              <p class="eyebrow">{{ upcomingCount }} upcoming event{{ upcomingCount === 1 ? '' : 's' }}</p>
              <h2>{{ calendarTitle }}</h2>
            </div>
            <div class="calendar-month-actions">
              <button type="button" aria-label="Previous month" @click="changeMonth(-1)">‹</button>
              <button type="button" aria-label="Next month" @click="changeMonth(1)">›</button>
            </div>
          </div>
          <div class="calendar-page-grid">
            <div class="calendar-page-weekdays">
              <span v-for="(day, index) in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="`${day}-${index}`">{{ day }}</span>
            </div>
            <div class="calendar-page-days">
              <div v-for="(day, index) in calendarDays" :key="day?.isoDate || `calendar-empty-${index}`" class="calendar-page-day" :class="{ 'is-empty': !day, 'is-today': day?.isToday, 'is-selected': day && selectedCalendarDate === day.isoDate }">
                <template v-if="day">
                  <button type="button" class="calendar-page-day-number" :aria-label="`Show events for ${formatDate(day.isoDate)}`" @click="selectCalendarDate(day.isoDate)">{{ day.day }}</button>
                  <button
                    v-for="event in (calendarEventsByDate.get(day.isoDate) || []).slice(0, 2)"
                    :key="`calendar-event-${event.id}`"
                    type="button"
                    class="calendar-event-chip"
                    @click="openEventDetails(event, $event.currentTarget)"
                  >{{ formatTime(event.event_time) }} · {{ event.title }}</button>
                  <span v-if="(calendarEventsByDate.get(day.isoDate) || []).length > 2" class="calendar-more-events">
                    +{{ (calendarEventsByDate.get(day.isoDate) || []).length - 2 }} more
                  </span>
                </template>
              </div>
            </div>
          </div>
          <p class="calendar-page-hint"><span></span> Select an event to see its details. Select a date to view that day’s events.</p>
        </section>

        <section v-if="currentPage === 'administrators' && user.role === 'owner'" class="admin-page-panel panel">
          <div class="admin-page-panel-heading">
            <div><h2>Portal accounts</h2><p>Only you can create or remove administrator access.</p></div>
            <span class="admin-count">{{ admins.length }}</span>
          </div>
          <div v-if="adminLoading" class="widget-empty">Loading accounts…</div>
          <div v-else-if="adminError" class="widget-error">{{ adminError }}</div>
          <div v-else-if="!admins.length" class="admin-page-empty">
            <span aria-hidden="true">♙</span><strong>No administrator accounts yet</strong><small>Add an account to allow another trusted person to manage events.</small>
          </div>
          <div v-else class="admin-page-list">
            <article v-for="admin in admins" :key="`admin-page-${admin.id}`" class="admin-page-row">
              <span class="avatar admin-page-avatar">{{ admin.name.slice(0, 1).toUpperCase() }}</span>
              <span class="admin-page-details"><strong>{{ admin.name }}</strong><small>{{ admin.email }}</small></span>
              <span class="admin-page-role" :class="admin.role">{{ admin.role === 'owner' ? 'Owner' : 'Administrator' }}</span>
              <span class="admin-page-status" :class="{ inactive: !admin.is_active }"><i></i>{{ admin.is_active ? 'Active' : 'Inactive' }}</span>
              <button v-if="admin.role === 'admin'" type="button" class="remove-admin-btn" :aria-label="`Remove ${admin.name}`" @click="removeAdmin(admin)">Remove</button>
            </article>
          </div>
        </section>

        <section v-if="currentPage === 'events'" id="events" class="events-section full-width">
          <div class="section-heading">
            <div>
              <div class="section-title-row"><span class="section-icon">▤</span><h2>Event Management</h2></div>
              <p>{{ selectedCalendarDate ? `Events on ${formatDate(selectedCalendarDate)}` : `Showing ${filteredEvents.length} of ${events.length} events` }}</p>
            </div>
            <div class="schedule-controls">
              <label class="event-search"><span class="sr-only">Search events</span><input v-model="search" type="search" placeholder="Search events, locations, organizers…" /></label>
              <div class="filter-pills" aria-label="Filter events">
                <button v-for="filter in ['all', 'upcoming', 'past']" :key="filter" type="button" :class="{ selected: dateFilter === filter && !selectedCalendarDate }" @click="dateFilter = filter; selectedCalendarDate = ''">{{ filter === 'all' ? 'All' : filter === 'upcoming' ? 'Upcoming' : 'Past' }}</button>
              </div>
              <label class="sort-select"><span class="sr-only">Sort events</span><select v-model="sortOrder" aria-label="Sort events"><option value="soonest">Soonest first</option><option value="latest">Latest first</option></select></label>
              <button class="export-btn" type="button" :disabled="!filteredEvents.length" @click="exportEvents">Export CSV</button>
            </div>
          </div>

          <div v-if="loading" class="empty-state loading-state" role="status"><span class="loading-mark" aria-hidden="true"></span><p>Loading events…</p></div>
          <div v-else-if="filteredEvents.length === 0" class="empty-state">
            <span class="empty-calendar">▤</span>
            <h3>{{ search || selectedCalendarDate ? 'No matching events' : 'Your event schedule is ready' }}</h3>
            <p>{{ search || selectedCalendarDate ? 'Try adjusting your search or filters.' : 'Create your first event to start building your schedule.' }}</p>
            <button v-if="!search && !selectedCalendarDate" class="primary-btn" type="button" @click="openCreateForm">＋ Create your first event</button>
            <button v-else class="clear-filter-btn" type="button" @click="search = ''; selectedCalendarDate = ''; dateFilter = 'all'">Clear filters</button>
          </div>
          <div v-else class="event-list">
            <article v-for="event in filteredEvents" :key="event.id" class="event-card">
              <div v-if="event.image_url" class="event-cover">
                <img :src="event.image_url" :alt="`${event.title} event cover`" />
              </div>
              <div v-else class="event-date-tile"><span>{{ formatDate(event.event_date, { month: 'short' }).toUpperCase() }}</span><strong>{{ new Date(`${String(event.event_date).slice(0, 10)}T00:00:00`).getDate() }}</strong><small>{{ new Date(`${String(event.event_date).slice(0, 10)}T00:00:00`).getFullYear() }}</small></div>
              <div class="event-main"><span class="event-status" :class="eventStatus(event).toLowerCase()">{{ eventStatus(event) }}</span><h3>{{ event.title }}</h3><p class="description">{{ event.description || 'No description provided.' }}</p><div class="event-meta"><span><b>◷</b>{{ formatTime(event.event_time) }}</span><span><b>⌖</b>{{ event.location }}</span><span><b>♙</b>{{ event.organizer || user.name }}</span></div></div>
              <div class="event-capacity"><span>CAPACITY</span><strong>{{ Number(event.capacity).toLocaleString() }}</strong><small>attendee spaces</small><div class="capacity-track"><i :style="{ width: event.capacity ? '34%' : '0%' }"></i></div></div>
              <div class="event-actions"><button class="edit-btn" type="button" @click="openEditForm(event)">Edit Event</button><button class="delete-btn" type="button" :aria-label="`Delete ${event.title}`" @click="deleteEvent(event)">Delete</button></div>
            </article>
          </div>
        </section>

        <section v-if="currentPage === 'homepage'" id="hero-slides" class="events-section full-width hero-management">
          <div class="section-heading hero-management-heading">
            <div>
              <div class="section-title-row"><span class="section-icon">✦</span><h2>Public homepage carousel</h2></div>
              <p>Manage the rotating announcements visitors see on the public homepage.</p>
            </div>
            <button class="hero-slide-add" type="button" @click="slideEditorOpen ? closeSlideForm() : openCreateSlideForm()">
              {{ slideEditorOpen ? 'Cancel editing' : '＋ Add slide' }}
            </button>
          </div>

          <div v-if="slideError" class="auth-error" role="alert">{{ slideError }}</div>
          <div v-if="slideSuccess" class="admin-success" role="status">{{ slideSuccess }}</div>

          <form v-if="slideEditorOpen" class="hero-slide-form" @submit.prevent="saveHeroSlide">
            <div class="hero-slide-form-title">
              <div><p class="eyebrow">CAROUSEL CONTENT</p><h3>{{ editingSlideId ? 'Edit homepage slide' : 'Create homepage slide' }}</h3></div>
              <label class="hero-slide-active"><input v-model="slideForm.is_active" type="checkbox" /> Show on public homepage</label>
            </div>
            <label class="hero-slide-field">
              <span>Small heading</span>
              <input v-model.trim="slideForm.eyebrow" required maxlength="100" placeholder="YOUR NEXT GOOD DAY STARTS HERE" />
            </label>
            <label class="hero-slide-field">
              <span>Main headline <small>Use | to split into lines</small></span>
              <input v-model.trim="slideForm.title" required maxlength="160" placeholder="Find your people. | Make a memory." />
            </label>
            <label class="hero-slide-field">
              <span>Description</span>
              <textarea v-model.trim="slideForm.description" required maxlength="500" rows="2" placeholder="A short message visitors will see on the homepage."></textarea>
            </label>
            <div class="hero-slide-form-row">
              <label class="hero-slide-field">
                <span>Round artwork text <small>Use | to split into lines</small></span>
                <input v-model.trim="slideForm.art_text" required maxlength="80" placeholder="Make | it a | moment." />
              </label>
              <label class="hero-slide-field hero-symbol-field">
                <span>Decorative symbol</span>
                <input v-model.trim="slideForm.symbol" required maxlength="12" placeholder="✦" />
              </label>
              <label class="hero-slide-field hero-order-field">
                <span>Slide order</span>
                <input v-model.number="slideForm.sort_order" type="number" min="0" max="999" required />
              </label>
            </div>
            <div class="hero-slide-form-actions">
              <button type="button" class="cancel-btn" @click="closeSlideForm">Cancel</button>
              <button type="submit" class="save-btn" :disabled="slideSaving">{{ slideSaving ? 'Saving…' : editingSlideId ? 'Save changes' : 'Create slide' }}</button>
            </div>
          </form>

          <div v-if="slideLoading" class="empty-state loading-state" role="status"><span class="loading-mark"></span><p>Loading homepage slides…</p></div>
          <div v-else-if="!managedHeroSlides.length" class="public-empty">
            <span aria-hidden="true">✦</span>
            <h3>No homepage slides yet</h3>
            <p>Add a slide to introduce your community and highlight what’s happening.</p>
          </div>
          <div v-else class="hero-slide-list">
            <article v-for="slide in managedHeroSlides" :key="`managed-slide-${slide.id}`" class="hero-slide-card">
              <div class="hero-slide-order">{{ slide.sort_order + 1 }}</div>
              <div class="hero-slide-preview">
                <span>{{ slide.eyebrow }}</span>
                <strong>{{ slideLines(slide.title).join(' ') }}</strong>
                <small>{{ slide.description }}</small>
              </div>
              <div class="hero-slide-card-status" :class="{ inactive: !slide.is_active }">
                <i></i>{{ slide.is_active ? 'Public' : 'Hidden' }}
              </div>
              <div class="hero-slide-card-actions">
                <button type="button" @click="editHeroSlide(slide)">Edit</button>
                <button type="button" @click="toggleHeroSlide(slide)">{{ slide.is_active ? 'Hide' : 'Publish' }}</button>
                <button type="button" class="hero-delete-action" :disabled="slideDeleteBusy === slide.id" @click="deleteHeroSlide(slide)">
                  {{ slideDeleteBusy === slide.id ? 'Deleting…' : 'Delete' }}
                </button>
              </div>
            </article>
          </div>
        </section>
      </main>

      <footer class="footer"><strong>Eventlist Admin Portal</strong><span>Manage events. Build better experiences.</span><span class="footer-right">{{ user.email }} · {{ user.role === 'owner' ? 'Owner' : 'Administrator' }}</span></footer>
    </div>

    <div v-if="adminModalOpen" class="modal-backdrop" @click.self="closeAdminModal">
      <section class="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-modal-title">
        <div class="admin-modal-heading"><div><p class="eyebrow">PORTAL ACCESS</p><h2 id="admin-modal-title">Manage administrators</h2><p>Create or remove accounts that can manage events.</p></div><button type="button" aria-label="Close dialog" @click="closeAdminModal">×</button></div>
        <div v-if="adminSuccess" class="admin-success" role="status">{{ adminSuccess }}</div>
        <div v-if="adminError" class="auth-error" role="alert">{{ adminError }}</div>
        <form class="admin-form" @submit.prevent="createAdmin">
          <label class="auth-field"><span>Administrator name</span><input v-model.trim="adminForm.name" autocomplete="name" maxlength="255" required placeholder="Full name" /></label>
          <label class="auth-field"><span>Email address</span><input v-model.trim="adminForm.email" type="email" autocomplete="email" maxlength="255" required placeholder="admin@example.com" /></label>
          <label class="auth-field"><span>Temporary password</span><input v-model="adminForm.password" type="password" autocomplete="new-password" minlength="12" maxlength="255" required placeholder="12+ chars, upper/lowercase, number and symbol" /></label>
          <label class="auth-field"><span>Confirm password</span><input v-model="adminForm.password_confirmation" type="password" autocomplete="new-password" minlength="12" maxlength="255" required placeholder="Enter the password again" /></label>
          <p class="admin-form-note">Share the initial password with the new administrator using a secure method. Only you can change administrator access.</p>
          <button class="auth-submit" type="submit" :disabled="adminSaving">{{ adminSaving ? 'Creating account…' : 'Create administrator' }}<span>→</span></button>
        </form>
        <div class="admin-modal-list">
          <h3>Current access <span>{{ admins.length }}</span></h3>
          <div v-for="admin in admins" :key="`modal-${admin.id}`" class="admin-list-row">
            <span class="avatar admin-avatar">{{ admin.name.slice(0, 1).toUpperCase() }}</span>
            <span class="admin-list-details"><strong>{{ admin.name }}</strong><small>{{ admin.email }}</small></span>
            <span class="role-badge" :class="admin.role">{{ admin.role === 'owner' ? 'Owner' : 'Admin' }}</span>
            <button v-if="admin.role === 'admin'" type="button" class="remove-admin-btn" :aria-label="`Remove ${admin.name}`" @click="removeAdmin(admin)">Remove</button>
          </div>
        </div>
      </section>
    </div>
  </div>

  <div v-if="forgotPasswordOpen" class="password-modal-backdrop" role="presentation" @click.self="closeForgotPassword" @keydown.esc.window="closeForgotPassword">
    <section class="password-modal" role="dialog" aria-modal="true" aria-labelledby="forgot-password-title">
      <button class="password-modal-close" type="button" aria-label="Close forgot password" @click="closeForgotPassword">×</button>
      <p class="eyebrow">ACCOUNT RECOVERY</p>
      <h3 id="forgot-password-title">Forgot your password?</h3>
      <p class="password-modal-subtitle">Enter your email address and we’ll send you a secure password reset link.</p>
      <div v-if="forgotPasswordError" class="auth-error" role="alert">{{ forgotPasswordError }}</div>
      <div v-if="forgotPasswordSuccess" class="auth-success" role="status">{{ forgotPasswordSuccess }}</div>
      <form v-if="!forgotPasswordSuccess" class="auth-form" @submit.prevent="submitForgotPassword">
        <label class="auth-field">
          <span>Email address</span>
          <input v-model.trim="forgotPasswordEmail" type="email" autocomplete="email" maxlength="255" placeholder="you@example.com" required />
        </label>
        <button class="auth-submit" type="submit" :disabled="forgotPasswordLoading">
          {{ forgotPasswordLoading ? 'Sending…' : 'Send reset link' }}
          <span aria-hidden="true">→</span>
        </button>
      </form>
    </section>
  </div>

  <div v-if="resetPasswordOpen" class="password-modal-backdrop" role="presentation" @keydown.esc.window="closeResetPassword">
    <section class="password-modal" role="dialog" aria-modal="true" aria-labelledby="reset-password-title">
      <button class="password-modal-close" type="button" aria-label="Close reset password" @click="closeResetPassword">×</button>
      <p class="eyebrow">SECURE YOUR ACCOUNT</p>
      <h3 id="reset-password-title">Create a new password</h3>
      <p class="password-modal-subtitle">Choose a strong password with at least 8 characters.</p>
      <div v-if="resetPasswordError" class="auth-error" role="alert">{{ resetPasswordError }}</div>
      <div v-if="resetPasswordSuccess" class="auth-success" role="status">{{ resetPasswordSuccess }}</div>
      <form v-if="!resetPasswordSuccess" class="auth-form" @submit.prevent="submitResetPassword">
        <label class="auth-field">
          <span>New password</span>
          <span class="password-input-wrap">
            <input v-model="resetPasswordForm.password" :type="resetPasswordVisible ? 'text' : 'password'" autocomplete="new-password" minlength="8" maxlength="255" required />
            <button class="password-toggle" type="button" :aria-label="resetPasswordVisible ? 'Hide new password' : 'Show new password'" @click="resetPasswordVisible = !resetPasswordVisible">
              <svg v-if="resetPasswordVisible" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.4 4.3A10.8 10.8 0 0112 4c5.5 0 9 4.8 9 8-.2 1.3-.9 2.7-1.9 3.8M6.2 6.2C4.2 7.6 3.1 9.6 3 12c0 3.2 3.5 8 9 8 1.2 0 2.4-.2 3.4-.7" /></svg>
              <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.5-8 9-8 9 8 9 8-3.5 8-9 8-9-8-9-8zM12 15a3 3 0 100-6 3 3 0 000 6z" /></svg>
            </button>
          </span>
        </label>
        <label class="auth-field">
          <span>Confirm new password</span>
          <span class="password-input-wrap">
            <input v-model="resetPasswordForm.password_confirmation" :type="resetConfirmationVisible ? 'text' : 'password'" autocomplete="new-password" minlength="8" maxlength="255" required />
            <button class="password-toggle" type="button" :aria-label="resetConfirmationVisible ? 'Hide password confirmation' : 'Show password confirmation'" @click="resetConfirmationVisible = !resetConfirmationVisible">
              <svg v-if="resetConfirmationVisible" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.4 4.3A10.8 10.8 0 0112 4c5.5 0 9 4.8 9 8-.2 1.3-.9 2.7-1.9 3.8M6.2 6.2C4.2 7.6 3.1 9.6 3 12c0 3.2 3.5 8 9 8 1.2 0 2.4-.2 3.4-.7" /></svg>
              <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.5-8 9-8 9 8 9 8-3.5 8-9 8-9-8-9-8zM12 15a3 3 0 100-6 3 3 0 000 6z" /></svg>
            </button>
          </span>
        </label>
        <button class="auth-submit" type="submit" :disabled="resetPasswordLoading">
          {{ resetPasswordLoading ? 'Updating…' : 'Reset password' }}
          <span aria-hidden="true">→</span>
        </button>
      </form>
      <button v-else class="auth-submit password-modal-done" type="button" @click="closeResetPassword">Back to sign in <span aria-hidden="true">→</span></button>
    </section>
  </div>

  <div v-if="selectedEventDetails" class="modal-backdrop event-details-backdrop" @click.self="closeEventDetails" @keydown.esc.window="closeEventDetails">
    <section
      class="event-details-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-details-title"
      tabindex="-1"
    >
      <div class="event-details-cover" :class="{ 'has-cover': selectedEventDetails.image_url }">
        <img
          v-if="selectedEventDetails.image_url"
          :src="selectedEventDetails.image_url"
          :alt="`${selectedEventDetails.title} event cover`"
        />
        <span v-else class="event-details-cover-mark" aria-hidden="true">✦</span>
        <span class="event-details-date">{{ formatDate(selectedEventDetails.event_date, { month: 'short', day: 'numeric' }) }}</span>
        <button ref="eventDetailsCloseButton" type="button" class="event-details-close" aria-label="Close event details" @click="closeEventDetails">×</button>
      </div>
      <div class="event-details-content">
        <span class="public-event-tag" :class="{ 'new-announcement': isNewAnnouncement(selectedEventDetails) }">
          {{ isNewAnnouncement(selectedEventDetails) ? 'New announcement' : eventStatus(selectedEventDetails) }}
        </span>
        <h2 id="event-details-title">{{ selectedEventDetails.title }}</h2>
        <p class="event-details-description">{{ selectedEventDetails.description || 'A new opportunity to connect with your community.' }}</p>
        <div class="event-details-facts">
          <div><span class="event-details-fact-icon" aria-hidden="true">▦</span><span><small>Date</small><strong>{{ formatDate(selectedEventDetails.event_date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}</strong></span></div>
          <div><span class="event-details-fact-icon" aria-hidden="true">◷</span><span><small>Time</small><strong>{{ formatTime(selectedEventDetails.event_time) }}</strong></span></div>
          <div><span class="event-details-fact-icon" aria-hidden="true">⌖</span><span><small>Location</small><strong>{{ selectedEventDetails.location }}</strong></span></div>
          <div><span class="event-details-fact-icon" aria-hidden="true">♙</span><span><small>Organizer</small><strong>{{ selectedEventDetails.organizer || 'To be announced' }}</strong></span></div>
          <div v-if="selectedEventDetails.capacity !== null && selectedEventDetails.capacity !== undefined">
            <span class="event-details-fact-icon" aria-hidden="true">＋</span>
            <span><small>Capacity</small><strong>{{ Number(selectedEventDetails.capacity).toLocaleString() }} spaces</strong></span>
          </div>
        </div>
        <section class="event-details-map-section" aria-labelledby="event-location-map-title">
          <div class="event-details-map-heading">
            <div>
              <h3 id="event-location-map-title">Event location</h3>
              <p>{{ selectedEventDetails.location }}</p>
            </div>
            <span class="event-map-provider">Mapbox</span>
          </div>
          <EventLocationMap
            v-if="hasPreciseEventLocation(selectedEventDetails)"
            :latitude="Number(selectedEventDetails.latitude)"
            :longitude="Number(selectedEventDetails.longitude)"
          />
          <p v-else class="event-details-map-missing">
            This event does not have a verified map pin yet. Ask the organizer to update its exact location.
          </p>
          <a
            class="event-details-directions"
            :href="getEventDirectionsUrl(selectedEventDetails)"
            target="_blank"
            rel="noopener noreferrer"
          >
            Get directions <span aria-hidden="true">→</span>
          </a>
        </section>
        <div class="event-details-actions">
          <button v-if="user?.role === 'owner' || user?.role === 'admin'" type="button" class="event-details-edit" @click="editEventFromDetails">Edit event</button>
          <button type="button" class="event-details-done" @click="closeEventDetails">Close details</button>
        </div>
      </div>
    </section>
  </div>
</template>

<style>
:root {
  font-family: 'DM Sans', 'Segoe UI', sans-serif;
  color: #172a35;
  background: #f3f6f7;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  --forest: #07382f;
  --green: #0c5848;
  --mint: #e8f4ef;
  --ink: #172a35;
  --muted: #71818b;
  --line: #e4eaec;
  --surface: #fff;
}

* { box-sizing: border-box; }
body { min-width: 320px; min-height: 100vh; margin: 0; }
button, input, select, textarea { font: inherit; }
button { cursor: pointer; }
button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible { outline: 3px solid #55a68d; outline-offset: 2px; }
.session-loading { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: #72817d; font-size: 13px; }
.brand-mark { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 11px; background: #0b765e; color: #f5d986; font: 700 27px 'Playfair Display', Georgia, serif; }

.auth-page { min-height: 100vh; display: grid; grid-template-columns: minmax(340px, .9fr) 1.1fr; background: #fff; }
.auth-story { position: relative; min-height: 100vh; display: flex; flex-direction: column; overflow: hidden; padding: 38px clamp(32px, 6vw, 88px); background: radial-gradient(ellipse at 75% 72%, rgb(33 117 86 / 42%), transparent 42%), linear-gradient(155deg, #062c28, #07483d 65%, #103e35); color: #fff; }
.auth-brand { z-index: 1; display: inline-flex; align-items: center; gap: 13px; color: #fff; font-size: 20px; font-weight: 700; text-decoration: none; }
.auth-story-copy { z-index: 1; margin: auto 0; }
.story-kicker, .hero-kicker { color: #8dcea5; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; }
.auth-story h1 { margin: 19px 0; font: 600 clamp(42px, 5vw, 68px)/1.08 'Playfair Display', Georgia, serif; letter-spacing: -1.6px; }
.auth-story-copy p { max-width: 430px; color: #c3d8d1; font-size: 16px; line-height: 1.75; }
.auth-footnote { z-index: 1; margin: 0; color: #98b7ad; font-size: 12px; }
.story-decoration { position: absolute; right: -7%; bottom: -90px; width: 240px; height: 240px; border: 1px solid rgb(232 213 148 / 18%); border-radius: 50%; }
.decoration-orbit { position: absolute; inset: 20px; border: 1px solid rgb(232 213 148 / 20%); border-radius: 50%; }
.orbit-two { inset: 48px; }
.decoration-calendar { position: absolute; top: 75px; left: 88px; width: 82px; height: 92px; display: grid; place-items: center; border: 1px solid rgb(234 243 231 / 70%); border-radius: 13px; background: rgb(230 244 234 / 12%); color: #f1d98f; font: 700 39px 'Playfair Display', Georgia, serif; box-shadow: 0 15px 50px #062d27; }
.decoration-spark { position: absolute; top: 29px; right: 47px; color: #d3ca71; font-size: 28px; }
.auth-panel { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 52px 7vw; }
.auth-card { width: min(430px, 100%); }
.eyebrow { margin: 0 0 10px; color: #0d7258; font-size: 11px; font-weight: 700; letter-spacing: 1.4px; }
.auth-card h2 { margin: 0; color: #162e2c; font: 600 32px 'Playfair Display', Georgia, serif; }
.auth-subtitle { margin: 10px 0 28px; color: #71817e; font-size: 14px; }
.auth-form { display: grid; gap: 17px; }
.auth-field { display: grid; gap: 8px; color: #334c48; font-size: 12px; font-weight: 700; }
.auth-field input { width: 100%; height: 47px; padding: 0 13px; border: 1px solid #dce5e2; border-radius: 7px; background: #fcfdfc; color: #1b302c; font-size: 14px; }
.auth-field input::placeholder { color: #a4afac; font-weight: 400; }
.password-label-row { display: flex; align-items: center; justify-content: space-between; }
.forgot-password-link { padding: 0; border: 0; background: none; color: #0c7458; font-size: 12px; font-weight: 700; cursor: pointer; }
.forgot-password-link:hover { text-decoration: underline; }
.password-input-wrap { position: relative; display: block; }
.password-input-wrap input { padding-right: 46px; }
.password-toggle { position: absolute; top: 50%; right: 8px; width: 34px; height: 34px; display: grid; place-items: center; transform: translateY(-50%); border: 0; border-radius: 50%; background: transparent; color: #71817e; cursor: pointer; }
.password-toggle:hover { background: #edf4f1; color: #0b624e; }
.password-toggle svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.password-modal-backdrop { position: fixed; z-index: 1000; inset: 0; display: grid; place-items: center; padding: 20px; background: rgb(7 38 34 / 58%); backdrop-filter: blur(4px); }
.password-modal { position: relative; width: min(430px, 100%); padding: 34px; border-radius: 12px; background: #fff; box-shadow: 0 24px 80px rgb(5 44 36 / 28%); }
.password-modal h3 { margin: 0; color: #162e2c; font: 600 28px 'Playfair Display', Georgia, serif; }
.password-modal-subtitle { margin: 8px 0 22px; color: #71817e; font-size: 13px; line-height: 1.55; }
.password-modal-close { position: absolute; top: 14px; right: 14px; width: 34px; height: 34px; border: 0; border-radius: 50%; background: #f2f5f3; color: #61736e; font-size: 22px; line-height: 34px; cursor: pointer; }
.password-modal-done { width: 100%; margin-top: 4px; }
.auth-submit { min-height: 49px; display: flex; align-items: center; justify-content: space-between; margin-top: 7px; padding: 0 17px; border: 0; border-radius: 7px; background: #0b624e; color: #fff; font-size: 14px; font-weight: 700; }
.auth-submit:hover { background: #084c3d; }
.auth-submit:disabled { cursor: wait; opacity: .7; }
.auth-submit span { font-size: 19px; }
.auth-switch { margin: 22px 0 0; color: #687a75; text-align: center; font-size: 13px; }
.auth-switch button { padding: 0; border: 0; background: none; color: #0c7458; font-weight: 700; }
.auth-mobile-app { width: 188px; min-height: 48px; display: grid; grid-template-columns: 34px 1fr; align-items: center; gap: 9px; margin: 16px auto 0; padding: 6px 9px; border: 1px solid #dce8df; border-radius: 7px; background: #f7faf7; color: #1a4a3b; text-decoration: none; }
.auth-mobile-app:hover { border-color: #b3cbbd; background: #eef5f0; }
.auth-mobile-app > span:first-child { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 50%; background: #1a604b; color: #fff; font-size: 16px; }
.auth-mobile-app > span:last-child { display: grid; }
.auth-mobile-app small { color: #829188; font-size: 7px; font-weight: 800; letter-spacing: .7px; }
.auth-mobile-app strong { margin-top: 1px; font-size: 11px; }
.auth-error { margin: 17px 0; padding: 11px 13px; border: 1px solid #f0ccc5; border-radius: 6px; background: #fff4f1; color: #934538; font-size: 13px; line-height: 1.5; }
.auth-success { margin: 17px 0; padding: 11px 13px; border: 1px solid #c5e1d0; border-radius: 6px; background: #f0f8f2; color: #276344; font-size: 13px; line-height: 1.5; }
.auth-legal { margin: 35px 0 0; color: #9aa8a4; text-align: center; font-size: 11px; }
.guest-preview { position: relative; z-index: 1; width: min(440px, 100%); margin: 0 0 24px; }
.guest-preview-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 9px; color: #dcebe3; font-size: 11px; }
.guest-preview-heading span { color: #a7c7b7; font-size: 10px; }
.guest-preview-event { display: grid; grid-template-columns: 58px minmax(0, 1fr) 16px; align-items: center; gap: 10px; padding: 10px; border: 1px solid rgb(208 234 221 / 15%); border-radius: 7px; background: rgb(248 255 250 / 7%); color: #dbece3; }
.guest-preview-event + .guest-preview-event { margin-top: 6px; }
.guest-preview-date { color: #e4d990; font-size: 10px; font-weight: 700; }
.guest-preview-event > span:nth-child(2) { display: grid; gap: 3px; min-width: 0; }
.guest-preview-event strong { overflow: hidden; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.guest-preview-event small, .guest-preview-empty { overflow: hidden; color: #a9c5b9; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.guest-preview-empty { margin: 0; }
.auth-admin-note { margin: 20px 0 0; color: #7e8e89; text-align: center; font-size: 11px; line-height: 1.6; }
.public-home { min-height: 100vh; background: #f5f7f3; color: #17352f; }
.public-topbar { position: sticky; top: 0; z-index: 30; height: 74px; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 0 clamp(20px, 7vw, 104px); border-bottom: 1px solid #e8ede8; background: rgb(255 255 255 / 96%); backdrop-filter: blur(14px); }
.public-brand { display: flex; align-items: center; gap: 11px; color: #123d32; font: 700 20px 'Playfair Display', Georgia, serif; text-decoration: none; }
.public-brand .brand-mark { width: 39px; height: 39px; font-size: 24px; }
.public-topbar nav { display: flex; align-items: center; gap: 25px; }
.public-topbar nav a, .public-user-name { color: #526b61; font-size: 12px; text-decoration: none; }
.public-topbar nav a:hover { color: #0b765e; }
.public-topbar .public-profile-trigger { gap: 9px; padding: 5px 8px; border-color: #e4ebe5; background: #fbfdfb; }
.public-topbar .public-profile-trigger:hover, .public-topbar .public-profile-trigger[aria-expanded="true"] { border-color: #cbded0; background: #f3f8f3; }
.public-hero { position: relative; min-height: 355px; display: flex; align-items: center; margin: 28px auto 0; padding: 45px clamp(24px, 8vw, 116px); overflow: hidden; width: min(1440px, calc(100% - 48px)); border-radius: 15px; background: radial-gradient(ellipse at 83% 50%, rgb(49 136 92 / 50%), transparent 34%), linear-gradient(115deg, #073b32, #0d5845 58%, #1c6a4b); color: #fff; }
.public-hero-slide { position: absolute; inset: 0; display: flex; align-items: center; justify-content: space-between; gap: 30px; padding: 45px clamp(24px, 8vw, 116px); }
.public-hero-copy { position: relative; z-index: 1; max-width: 680px; padding-bottom: 20px; }
.public-hero h1 { margin: 15px 0 12px; font: 600 clamp(38px, 5vw, 60px)/1.07 'Playfair Display', Georgia, serif; letter-spacing: -1.2px; }
.public-hero p { max-width: 440px; margin: 0; color: #c8ded2; font-size: 14px; line-height: 1.7; }
.public-hero-button { display: inline-flex; align-items: center; gap: 24px; margin-top: 23px; padding: 12px 16px; border-radius: 6px; background: #f8fbf8; color: #19553f; font-size: 12px; font-weight: 700; text-decoration: none; }
.public-hero-button:hover { background: #e5f1e8; }
.public-hero-art { position: relative; width: 200px; height: 210px; flex: 0 0 auto; display: grid; place-items: center; border: 1px solid rgb(231 246 230 / 27%); border-radius: 50%; background: rgb(246 255 245 / 8%); color: #e4d98d; transform: rotate(7deg); }
.public-hero-art strong { color: #f2f4e3; font: 600 28px/1.05 'Playfair Display', Georgia, serif; text-align: center; }
.public-hero-art span { position: absolute; top: 26px; right: 35px; font-size: 25px; }
.public-hero-art i { position: absolute; bottom: 20px; left: 28px; font-size: 30px; font-style: normal; }
.public-hero-controls { position: absolute; z-index: 2; right: clamp(24px, 8vw, 116px); bottom: 25px; display: flex; align-items: center; }
.public-hero-dots { display: flex; align-items: center; gap: 6px; }
.public-hero-dots button { width: 7px; height: 7px; padding: 0; border: 0; border-radius: 9px; background: rgb(238 248 239 / 48%); transition: width .25s ease, background .25s ease; }
.public-hero-dots button.active { width: 22px; background: #e4d98d; }
.hero-slide-enter-active, .hero-slide-leave-active { transition: opacity .35s ease, transform .35s ease; }
.hero-slide-enter-from { opacity: 0; transform: translateX(24px); }
.hero-slide-leave-to { opacity: 0; transform: translateX(-24px); }
.public-quick-stats { width: min(1280px, calc(100% - 48px)); min-height: 82px; display: grid; grid-template-columns: repeat(3, 1fr) auto; align-items: center; gap: 24px; margin: 16px auto 0; padding: 14px 18px; border: 1px solid #e3ebe4; border-radius: 9px; background: #fff; }
.public-quick-stats > div { display: flex; align-items: center; gap: 12px; border-right: 1px solid #e5ece6; }
.public-quick-stats > div > span { color: #9ab4a7; font-size: 9px; font-weight: 800; }
.public-quick-stats p { margin: 0; color: #71837a; font-size: 11px; }
.public-quick-stats p strong { margin-right: 4px; color: #1d5543; font-size: 17px; }
.public-quick-stats a { display: inline-flex; align-items: center; gap: 18px; color: #1a604b; font-size: 11px; font-weight: 800; text-decoration: none; white-space: nowrap; }
.public-mobile-link { min-height: 38px; display: inline-flex; align-items: center; gap: 8px; padding: 0 12px; border-radius: 6px; background: #173f34 !important; color: #fff !important; }
.public-mobile-link:hover { background: #0d604b !important; }
.public-app-banner { width: min(1280px, calc(100% - 48px)); min-height: 330px; display: grid; grid-template-columns: 1fr 360px; align-items: center; gap: 40px; margin: 18px auto 0; overflow: hidden; padding: 42px clamp(30px, 6vw, 76px); border-radius: 13px; background: radial-gradient(circle at 78% 50%, rgb(244 220 139 / 18%), transparent 24%), linear-gradient(120deg, #0a4034, #196248 72%, #2b7955); color: #fff; }
.public-app-copy { position: relative; z-index: 2; }
.public-app-kicker { color: #d6c980; font-size: 9px; font-weight: 800; letter-spacing: 1.8px; }
.public-app-copy h2 { margin: 9px 0 8px; font: 600 clamp(32px, 4vw, 48px)/1.06 'Playfair Display', Georgia, serif; }
.public-app-copy > p { max-width: 520px; margin: 0 0 20px; color: #d1e2d7; font-size: 12px; line-height: 1.75; }
.public-app-copy > a { width: 220px; min-height: 58px; display: grid; grid-template-columns: 38px 1fr 20px; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 8px; background: #fff; color: #173f34; text-decoration: none; box-shadow: 0 12px 28px rgb(6 48 36 / 18%); }
.public-app-copy > a:hover { background: #f2f6f2; transform: translateY(-2px); }
.android-download-icon { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 50%; background: #e7efe9; color: #1d694d; font-size: 20px; }
.public-app-copy > a > span:nth-child(2) { display: grid; }
.public-app-copy > a small { color: #789087; font-size: 8px; font-weight: 800; letter-spacing: .8px; }
.public-app-copy > a strong { margin-top: 2px; font-size: 13px; }
.public-app-copy > a b { color: #7a9185; }
.public-app-note { display: block; margin-top: 10px; color: #b6cdbf; font-size: 9px; }
.public-phone-mockup { position: relative; width: 210px; height: 294px; justify-self: center; padding: 8px; border: 4px solid #dfe8e1; border-radius: 30px; background: #17372f; box-shadow: 0 24px 50px rgb(4 38 28 / 30%); transform: rotate(6deg) translateY(24px); }
.public-phone-speaker { position: absolute; z-index: 2; top: 13px; left: 50%; width: 44px; height: 5px; border-radius: 4px; background: #102b24; transform: translateX(-50%); }
.public-phone-screen { height: 100%; overflow: hidden; border-radius: 20px; background: #f7faf7; }
.phone-status { height: 27px; display: flex; align-items: center; justify-content: space-between; padding: 7px 12px 0; color: #355b4c; font-size: 7px; font-weight: 800; }
.phone-brand { height: 38px; display: flex; align-items: center; gap: 7px; padding: 4px 12px; color: #173f34; font-size: 11px; }
.phone-brand span { width: 24px; height: 24px; display: grid; place-items: center; border-radius: 50%; background: #173f34; color: #efdda0; font-size: 12px; }
.phone-card-art { position: relative; height: 118px; display: grid; place-items: center; margin: 5px 9px; border-radius: 9px; background: radial-gradient(circle at 80% 30%, rgb(233 219 151 / 30%), transparent 25%), linear-gradient(135deg, #09382e, #27704b); color: #edf2e8; text-align: center; }
.phone-card-art strong { font: 600 21px/1.05 'Playfair Display', Georgia, serif; }
.phone-card-art > span { position: absolute; top: 9px; right: 14px; color: #e7d889; font-size: 14px; }
.phone-feature { margin: 8px 10px; }
.phone-feature span { color: #8c9c94; font-size: 7px; font-weight: 800; letter-spacing: .8px; }
.phone-feature strong { display: block; margin-top: 4px; color: #214c3d; font: 600 12px 'Playfair Display', Georgia, serif; }
.phone-feature small { display: block; margin-top: 5px; color: #6d8278; font-size: 7px; }
.public-featured-section { width: min(1280px, calc(100% - 48px)); margin: 0 auto; padding: 50px 0 8px; scroll-margin-top: 90px; }
.public-featured-heading { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 16px; }
.public-featured-heading h2 { margin: 4px 0 0; font: 600 27px 'Playfair Display', Georgia, serif; }
.public-featured-heading a { color: #35705a; font-size: 11px; font-weight: 800; text-decoration: none; }
.public-featured-heading a span { margin-left: 8px; }
.public-featured-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.public-featured-card { min-height: 112px; display: grid; grid-template-columns: 78px 1fr; align-items: center; gap: 14px; padding: 14px; border: 1px solid #dee8e0; border-radius: 8px; background: linear-gradient(135deg, #fff, #f8faf7); cursor: pointer; transition: border-color .18s ease, transform .18s ease; }
.public-featured-card:hover { border-color: #b5cbbd; transform: translateY(-2px); }
.public-featured-card:focus-visible { outline: 3px solid #55a68d; outline-offset: 3px; }
.public-featured-date { height: 82px; display: grid; align-content: center; text-align: center; border-radius: 6px; background: #eaf2ec; color: #205944; }
.public-featured-date strong { font: 700 26px 'Playfair Display', Georgia, serif; }
.public-featured-date span { font-size: 9px; font-weight: 800; text-transform: uppercase; }
.public-featured-card > div:last-child { min-width: 0; }
.public-featured-card > div:last-child > span { color: #759084; font-size: 9px; }
.public-featured-card h3 { overflow: hidden; margin: 6px 0 5px; font: 600 16px 'Playfair Display', Georgia, serif; text-overflow: ellipsis; white-space: nowrap; }
.public-featured-card p { overflow: hidden; margin: 0; color: #7b8c84; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.public-featured-empty { color: #71837a; font-size: 11px; }
.public-events-section { width: min(1280px, calc(100% - 48px)); margin: 0 auto; padding: 48px 0 64px; }
.public-section-heading { display: flex; align-items: end; justify-content: space-between; gap: 25px; margin-bottom: 22px; }
.public-section-heading .eyebrow { margin-bottom: 8px; }
.public-section-heading h2 { margin: 0; color: #193b32; font: 600 31px 'Playfair Display', Georgia, serif; }
.public-section-heading > div > p:last-child { margin: 7px 0 0; color: #7c8a83; font-size: 12px; }
.public-event-summary { display: flex; align-items: center; gap: 0; margin-top: 14px; color: #789087; font-size: 10px; }
.public-event-summary span { min-width: 82px; padding-right: 12px; border-right: 1px solid #dfe8e1; }
.public-event-summary span + span { padding-left: 12px; }
.public-event-summary span:last-child { border-right: 0; }
.public-event-summary strong { margin-right: 4px; color: #1c5945; font-size: 15px; }
.public-event-filters { display: flex; gap: 8px; margin-bottom: 18px; }
.public-event-filters button { min-height: 38px; display: inline-flex; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid #dce7df; border-radius: 22px; background: #fff; color: #637b70; font-size: 11px; font-weight: 700; cursor: pointer; }
.public-event-filters button span { min-width: 20px; height: 20px; display: inline-grid; place-items: center; border-radius: 10px; background: #edf4ef; color: #557263; font-size: 9px; }
.public-event-filters button.selected { border-color: #0d604b; background: #0d604b; color: #fff; box-shadow: 0 6px 16px rgb(16 89 66 / 12%); }
.public-event-filters button.selected span { background: rgb(255 255 255 / 16%); color: #fff; }
.public-search { width: min(300px, 100%); height: 42px; display: flex; align-items: center; gap: 9px; padding: 0 12px; border: 1px solid #dde7df; border-radius: 7px; background: #fff; color: #43735c; }
.public-search > span { font-size: 22px; }
.public-search input { width: 100%; border: 0; outline: 0; background: transparent; color: #29473b; font-size: 11px; }
.public-event-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.public-event-card { overflow: hidden; border: 1px solid #e2eae3; border-radius: 10px; background: #fff; box-shadow: 0 5px 18px rgb(23 61 47 / 4%); cursor: pointer; transition: transform .18s ease, box-shadow .18s ease; }
.public-event-card:hover { transform: translateY(-3px); box-shadow: 0 12px 28px rgb(23 61 47 / 9%); }
.public-event-card:focus-visible { outline: 3px solid #55a68d; outline-offset: 3px; }
.public-event-art { position: relative; min-height: 135px; display: flex; align-items: flex-start; justify-content: space-between; padding: 16px; overflow: hidden; background: radial-gradient(circle at 75% 35%, rgb(246 225 137 / 34%), transparent 17%), linear-gradient(135deg, #0a4739, #2a7950); color: #f0e2a1; }
.public-event-art.has-cover::after { position: absolute; inset: 0; background: linear-gradient(180deg, rgb(5 42 32 / 12%), transparent 40%, rgb(5 42 32 / 38%)); content: ''; }
.public-event-cover { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.public-event-art > span:last-child { align-self: center; margin-right: 20%; font-size: 52px; opacity: .8; }
.public-event-date { position: relative; z-index: 1; padding: 6px 9px; border: 1px solid rgb(255 255 255 / 28%); border-radius: 5px; background: rgb(255 255 255 / 12%); color: #fff; font-size: 10px; font-weight: 700; backdrop-filter: blur(8px); }
.public-event-body { padding: 16px; }
.public-event-tag { color: #26815d; font-size: 9px; font-weight: 700; letter-spacing: .8px; text-transform: uppercase; }
.public-event-tag.new-announcement { display: inline-flex; width: max-content; padding: 5px 8px; border-radius: 20px; background: #fff3d4; color: #8a6417; letter-spacing: .5px; }
.public-event-body h3 { margin: 7px 0 6px; color: #1c3c32; font: 600 20px 'Playfair Display', Georgia, serif; }
.public-event-body > p { min-height: 38px; margin: 0; color: #77877e; font-size: 11px; line-height: 1.6; }
.public-event-meta { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 15px; padding-top: 12px; border-top: 1px solid #edf1ed; color: #587267; font-size: 10px; }
.public-event-details-link { display: flex; align-items: center; justify-content: space-between; margin-top: 13px; color: #277052; font-size: 10px; font-weight: 700; }
.public-event-details-link > span { font-size: 16px; transition: transform .18s ease; }
.public-event-card:hover .public-event-details-link > span { transform: translateX(3px); }
.public-empty { min-height: 185px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 24px; border: 1px dashed #d4e2d7; border-radius: 9px; background: #fbfdfb; color: #768a7e; text-align: center; }
.public-empty > span { color: #72a986; font-size: 26px; }
.public-empty h3, .public-empty p { margin: 0; }
.public-empty h3 { color: #26483b; font: 600 18px 'Playfair Display', Georgia, serif; }
.public-empty p { font-size: 11px; line-height: 1.6; }
.public-empty button { margin-top: 5px; padding: 8px 12px; border: 1px solid #cddfd2; border-radius: 5px; background: white; color: #28664d; font-size: 10px; font-weight: 700; }
.public-venues-section { width: min(1280px, calc(100% - 48px)); display: grid; grid-template-columns: 220px 1fr; align-items: center; gap: 28px; margin: 0 auto; padding: 38px 0 46px; border-top: 1px solid #e0e8e1; scroll-margin-top: 90px; }
.public-venues-section h2 { margin: 4px 0 0; font: 600 25px 'Playfair Display', Georgia, serif; }
.public-location-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.public-location-list button { min-height: 50px; display: grid; grid-template-columns: 24px minmax(0, 1fr) auto; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid #dde7df; border-radius: 7px; background: #fff; color: #3e6656; text-align: left; cursor: pointer; }
.public-location-list button:hover { border-color: #acc6b7; background: #f9fbf8; }
.public-location-list button > span { width: 24px; height: 24px; display: grid; place-items: center; border-radius: 50%; background: #edf4ef; color: #397258; }
.public-location-list button strong { overflow: hidden; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.public-location-list button b { color: #8ba399; }
.public-footer { min-height: 210px; display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 30px; padding: 38px clamp(20px, 7vw, 104px) 54px; border-top: 1px solid #dce6de; background: #163f34; color: #b7cfc3; font-size: 10px; position: relative; }
.public-footer-brand strong { display: flex; align-items: center; gap: 9px; color: #fff; font: 700 18px 'Playfair Display', Georgia, serif; }
.public-footer-brand .brand-mark { width: 34px; height: 34px; display: grid; place-items: center; background: #e6d991; color: #173f33; font-size: 20px; }
.public-footer-brand p { max-width: 370px; margin: 14px 0 0; line-height: 1.7; }
.public-footer nav { display: flex; flex-direction: column; gap: 8px; }
.public-footer nav p { margin: 0 0 5px; color: #fff; font-size: 9px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
.public-footer nav a, .public-footer nav button { width: fit-content; padding: 0; border: 0; background: none; color: #b7cfc3; font-size: 10px; text-decoration: none; cursor: pointer; }
.public-footer nav a:hover, .public-footer nav button:hover { color: #fff; }
.public-footer-bottom { position: absolute; right: clamp(20px, 7vw, 104px); bottom: 18px; left: clamp(20px, 7vw, 104px); display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid rgb(255 255 255 / 10%); }

.app-shell { min-height: 100vh; display: grid; grid-template-columns: 232px minmax(0, 1fr); background: #f4f7f8; }
.sidebar { position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; padding: 18px 14px 14px; background: linear-gradient(165deg, #062f2b, #073a32 70%, #06463a); color: #eaf5f0; }
.sidebar-brand { display: flex; align-items: center; gap: 12px; padding: 0 10px 22px; color: white; font: 700 20px 'Playfair Display', Georgia, serif; text-decoration: none; }
.sidebar-brand .brand-mark { width: 44px; height: 44px; background: #0c7057; }
.side-nav { display: grid; gap: 6px; }
.nav-link { width: 100%; min-height: 43px; display: flex; align-items: center; gap: 13px; padding: 0 13px; border: 0; border-radius: 7px; background: transparent; color: #c4d7d1; text-align: left; text-decoration: none; font-size: 13px; font-weight: 600; }
.nav-link span { width: 19px; color: #d8e9e2; text-align: center; font-size: 18px; }
.nav-link:hover, .nav-link.active { background: #12644f; color: #fff; }
.sidebar-note { position: relative; min-height: 202px; margin-top: auto; padding: 18px 15px; overflow: hidden; border: 1px solid rgb(121 188 157 / 26%); border-radius: 10px; background: linear-gradient(145deg, rgb(9 77 63 / 80%), rgb(5 46 41 / 86%)); }
.sidebar-note-icon { display: block; margin-bottom: 12px; color: #c7d985; font-size: 24px; }
.sidebar-note strong { position: relative; z-index: 1; display: block; font: 600 17px/1.3 'Playfair Display', Georgia, serif; }
.sidebar-note p { position: relative; z-index: 1; margin: 9px 0 0; color: #bbd2c8; font-size: 11px; line-height: 1.6; }
.note-leaf { position: absolute; right: 8px; bottom: -27px; color: rgb(159 207 145 / 26%); font-size: 94px; transform: rotate(-24deg); }
.sidebar-footer { display: flex; align-items: center; gap: 10px; margin-top: 14px; padding: 12px 4px 0; border-top: 1px solid rgb(212 232 224 / 16%); }
.avatar { width: 36px; height: 36px; flex: 0 0 auto; display: grid; place-items: center; border-radius: 50%; background: #d9e8df; color: #145844; font-weight: 700; }
.sidebar-user { display: grid; min-width: 0; gap: 2px; }
.sidebar-user strong { overflow: hidden; color: #f3f8f5; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.sidebar-user small { color: #a9c1b8; font-size: 10px; }
.workspace { min-width: 0; }
.topbar { position: sticky; top: 0; z-index: 5; height: 67px; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 0 clamp(20px, 3vw, 42px); border-bottom: 1px solid #e8edef; background: rgb(255 255 255 / 96%); }
.top-search { width: min(460px, 55%); height: 41px; display: flex; align-items: center; gap: 10px; padding: 0 13px; border: 1px solid #e4eaed; border-radius: 7px; background: #f5f8fa; color: #35544f; }
.top-search > span { font-size: 24px; line-height: 1; transform: rotate(-20deg); }
.top-search input { width: 100%; border: 0; outline: 0; background: transparent; color: #243a40; font-size: 12px; }
.top-search input::placeholder { color: #8d9ba4; }
.topbar-account { display: flex; align-items: center; gap: 10px; }
.workspace-status { display: flex; align-items: center; gap: 7px; margin-right: 13px; color: #71857f; font-size: 9px; font-weight: 700; letter-spacing: .8px; }
.workspace-status i { width: 7px; height: 7px; border-radius: 50%; background: #3ba37a; }
.profile-menu { position: relative; }
.profile-trigger { display: flex; align-items: center; gap: 10px; padding: 5px 7px; border: 1px solid transparent; border-radius: 8px; background: transparent; text-align: left; }
.profile-trigger:hover, .profile-trigger[aria-expanded="true"] { border-color: #e3ebe6; background: #f7faf8; }
.avatar-small { width: 34px; height: 34px; }
.account-name { display: grid; gap: 2px; }
.account-name strong { color: #263d43; font-size: 11px; }
.account-name small { color: #819098; font-size: 10px; }
.profile-chevron { color: #71857f; font-size: 14px; }
.profile-dropdown { position: absolute; z-index: 20; top: calc(100% + 8px); right: 0; width: 230px; padding: 7px; border: 1px solid #e2eae5; border-radius: 9px; background: #fff; box-shadow: 0 12px 30px rgb(22 53 41 / 14%); }
.profile-dropdown-user { display: grid; gap: 4px; padding: 10px; border-bottom: 1px solid #edf1ed; }
.profile-dropdown-user strong { overflow: hidden; color: #263d37; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.profile-dropdown-user small { overflow: hidden; color: #819088; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.profile-dropdown > button { width: 100%; display: flex; align-items: center; gap: 9px; margin-top: 5px; padding: 10px; border: 0; border-radius: 6px; background: transparent; color: #785148; text-align: left; font-size: 11px; font-weight: 700; }
.profile-dropdown > button:hover { background: #fff5f1; }
.profile-dropdown > button span { font-size: 15px; }
.dashboard { width: min(1680px, 100%); display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, .9fr) minmax(250px, .58fr); align-items: start; gap: 14px; margin: 0 auto; padding: 17px; }
.dashboard.single-page { display: block; width: min(1420px, 100%); padding: 28px clamp(16px, 3vw, 42px) 42px; }
.single-page > * + * { margin-top: 18px; }
.admin-page-heading { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 20px; padding: 2px 0 17px; border-bottom: 1px solid #e3eae6; }
.admin-page-heading .eyebrow { margin: 0 0 6px; color: #438269; font-size: 9px; font-weight: 700; letter-spacing: 1px; }
.admin-page-heading h1 { margin: 0; color: #1b3c32; font: 600 clamp(25px, 3vw, 34px)/1.2 'Playfair Display', Georgia, serif; }
.admin-page-heading > div > p:last-child { margin: 7px 0 0; color: #7d8b83; font-size: 12px; line-height: 1.55; }
.admin-page-primary { min-height: 39px; flex: 0 0 auto; padding: 0 14px; border: 1px solid #1e6e52; border-radius: 6px; background: #1e6e52; color: white; font-size: 11px; font-weight: 700; }
.admin-page-primary:hover { background: #175c43; }
.form-back-link { margin-top: 13px; padding: 8px 0; border: 0; background: transparent; color: #39745c; font-size: 11px; font-weight: 700; }
.analytics-page-panel { max-width: 1050px; padding: 22px; }
.analytics-page-panel .chart-bars { height: 245px; gap: 18px; }
.analytics-page-panel .chart-track { width: min(42px, 100%); }
.analytics-page-panel .chart-column small { font-size: 10px; }
.analytics-page-panel .chart-column strong { font-size: 11px; }
.calendar-page { padding: 23px; }
.calendar-page-heading, .admin-page-panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 15px; }
.calendar-page-heading { margin-bottom: 18px; }
.calendar-page-heading .eyebrow { margin: 0 0 5px; }
.calendar-page-heading h2 { margin: 0; color: #254439; font: 600 23px 'Playfair Display', Georgia, serif; }
.calendar-month-actions { display: flex; gap: 7px; }
.calendar-month-actions button { width: 36px; height: 36px; border: 1px solid #dfe8e2; border-radius: 6px; background: white; color: #426757; font-size: 23px; line-height: 1; }
.calendar-month-actions button:hover { background: #f0f7f2; }
.calendar-page-weekdays, .calendar-page-days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }
.calendar-page-weekdays { border: 1px solid #e6ece8; border-bottom: 0; border-radius: 8px 8px 0 0; background: #f7faf8; }
.calendar-page-weekdays span { padding: 11px 8px; color: #667c70; text-align: center; font-size: 10px; font-weight: 700; }
.calendar-page-days { overflow: hidden; border: 1px solid #e6ece8; border-radius: 0 0 8px 8px; }
.calendar-page-day { min-width: 0; min-height: 114px; display: flex; flex-direction: column; align-items: stretch; gap: 5px; padding: 8px; border-right: 1px solid #e9efeb; border-bottom: 1px solid #e9efeb; background: white; }
.calendar-page-day:nth-child(7n) { border-right: 0; }
.calendar-page-day.is-empty { background: #fafcfb; }
.calendar-page-day.is-today { background: #f4faf5; }
.calendar-page-day.is-selected { box-shadow: inset 0 0 0 2px #56a276; }
.calendar-page-day-number { width: 28px; height: 28px; align-self: flex-end; border: 0; border-radius: 50%; background: transparent; color: #5a7165; font-size: 10px; }
.calendar-page-day.is-today .calendar-page-day-number { background: #17684d; color: white; font-weight: 700; }
.calendar-event-chip { min-width: 0; padding: 5px 6px; overflow: hidden; border: 0; border-radius: 4px; background: #eaf5ee; color: #28694d; text-align: left; text-overflow: ellipsis; white-space: nowrap; font-size: 9px; font-weight: 600; }
.calendar-event-chip:hover { background: #dcefe2; }
.calendar-more-events { padding-left: 5px; color: #7d8e83; font-size: 8px; }
.calendar-page-hint { display: flex; align-items: center; gap: 7px; margin: 14px 0 0; color: #7b8b81; font-size: 10px; }
.calendar-page-hint > span { width: 7px; height: 7px; border-radius: 50%; background: #36a06d; }
.admin-page-panel { max-width: 1080px; padding: 21px; }
.admin-page-panel-heading { margin-bottom: 13px; padding-bottom: 14px; border-bottom: 1px solid #edf1ee; }
.admin-page-panel-heading h2 { margin: 0; color: #28473b; font: 600 18px 'Playfair Display', Georgia, serif; }
.admin-page-panel-heading p { margin: 5px 0 0; color: #829087; font-size: 10px; }
.admin-page-list { display: grid; }
.admin-page-row { min-width: 0; display: flex; align-items: center; gap: 13px; padding: 12px 4px; border-bottom: 1px solid #edf1ee; }
.admin-page-row:last-child { border-bottom: 0; }
.admin-page-avatar { width: 38px; height: 38px; font-size: 13px; }
.admin-page-details { min-width: 0; flex: 1; display: grid; gap: 4px; }
.admin-page-details strong { overflow: hidden; color: #304b3e; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.admin-page-details small { overflow: hidden; color: #829087; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.admin-page-role, .admin-page-status { display: flex; align-items: center; gap: 6px; color: #5b7767; font-size: 9px; font-weight: 700; white-space: nowrap; }
.admin-page-role { min-width: 86px; }
.admin-page-role.owner { color: #92702c; }
.admin-page-status i { width: 7px; height: 7px; border-radius: 50%; background: #40a578; }
.admin-page-status.inactive { color: #9a6b60; }
.admin-page-status.inactive i { background: #c97a67; }
.admin-page-empty { min-height: 160px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #788780; text-align: center; }
.admin-page-empty > span { color: #5d9c79; font-size: 27px; }
.admin-page-empty strong { color: #355347; font-size: 12px; }
.admin-page-empty small { max-width: 340px; font-size: 10px; line-height: 1.5; }
.dashboard-main, .dashboard-rail { min-width: 0; }
.full-width, .hero-banner { grid-column: 1 / -1; }
.hero-banner { position: relative; min-height: 210px; display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; padding: 24px 26px 20px; overflow: hidden; border-radius: 11px; background: radial-gradient(ellipse at 78% 10%, rgb(196 165 83 / 20%), transparent 24%), radial-gradient(ellipse at 80% 130%, #153e30 0%, transparent 38%), linear-gradient(115deg, #042f29 5%, #08463a 55%, #093b32); color: white; }
.hero-banner::before { position: absolute; inset: 0; background-image: radial-gradient(rgb(255 255 255 / 13%) .7px, transparent .7px); background-size: 14px 14px; content: ''; opacity: .22; }
.hero-content { position: relative; z-index: 1; }
.hero-content h1 { margin: 8px 0 5px; font: 700 clamp(29px, 3vw, 43px)/1.1 'Playfair Display', Georgia, serif; letter-spacing: -.5px; }
.hero-content > p:not(.hero-kicker) { margin: 0; color: #d4e4dc; font-size: 13px; }
.hero-metrics { display: flex; align-items: center; gap: 0; margin-top: 24px; }
.hero-metrics > div { min-width: 119px; display: grid; grid-template-columns: 34px 1fr; grid-template-rows: 18px 17px; align-items: center; gap: 0 9px; padding: 0 15px; border-right: 1px solid rgb(225 239 231 / 20%); }
.hero-metrics > div:first-child { padding-left: 0; }
.hero-metrics > div:last-child { border: 0; }
.metric-icon { grid-row: 1 / 3; width: 32px; height: 32px; display: grid; place-items: center; border-radius: 9px; background: rgb(72 151 121 / 28%); color: #d6e8b3; font-size: 17px; }
.hero-metrics strong { color: #fff; font-size: 14px; line-height: 1; }
.hero-metrics small { color: #c3d7ce; font-size: 9px; }
.hero-create { position: relative; z-index: 1; min-width: 148px; min-height: 42px; align-self: flex-end; display: flex; align-items: center; justify-content: center; gap: 7px; padding: 0 12px; border: 1px solid #5cc18d; border-radius: 7px; background: linear-gradient(135deg, #1a9b70, #12865e); color: #fff; font-size: 11px; font-weight: 700; box-shadow: 0 6px 20px rgb(3 23 19 / 20%); }
.hero-create > span { font-size: 18px; font-weight: 400; }
.hero-create b { margin-left: auto; font-size: 20px; font-weight: 400; }
.hero-glow { position: absolute; top: -50px; right: 18%; width: 310px; height: 270px; border: 1px solid rgb(213 197 132 / 12%); border-radius: 50%; box-shadow: 0 0 0 35px rgb(213 197 132 / 3%), 0 0 0 75px rgb(213 197 132 / 2%); }
.panel { min-width: 0; padding: 15px; border: 1px solid #e6ecee; border-radius: 9px; background: #fff; box-shadow: 0 2px 8px rgb(28 54 62 / 3%); }
.panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.panel-heading h2 { margin: 0; color: #233d45; font: 600 14px 'Playfair Display', Georgia, serif; }
.panel-heading p { margin: 4px 0 0; color: #89979c; font-size: 9px; }
.live-badge { display: flex; align-items: center; gap: 5px; padding: 4px 6px; border-radius: 10px; background: #edf7f1; color: #398363; font-size: 7px; font-weight: 700; letter-spacing: .5px; }
.live-badge i { width: 5px; height: 5px; border-radius: 50%; background: #3ca579; }
.analytics-panel { min-height: 270px; }
.chart-bars { height: 158px; display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); align-items: end; gap: 8px; padding: 8px 5px 0; border-bottom: 1px solid #edf1f1; background: repeating-linear-gradient(to bottom, transparent 0, transparent 38px, #eef2f1 39px, transparent 40px); }
.chart-column { height: 100%; display: grid; grid-template-rows: 15px 1fr 18px; justify-items: center; align-items: end; gap: 4px; color: #85959b; }
.chart-column strong { color: #36795f; font-size: 9px; }
.chart-track { width: min(24px, 100%); height: 100%; display: flex; align-items: flex-end; overflow: hidden; border-radius: 6px 6px 0 0; background: #eaf3ef; }
.chart-track i { width: 100%; min-height: 4px; border-radius: 5px 5px 0 0; background: linear-gradient(180deg, #32a178, #0d694f); transition: height .25s ease; }
.chart-column small { font-size: 8px; }
.analytics-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
.analytics-summary > div { display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: 6px; background: #f7faf8; }
.analytics-icon { width: 27px; height: 27px; display: grid; place-items: center; border-radius: 50%; background: #e6f4ec; color: #247658; font-size: 13px; }
.analytics-summary p { display: grid; gap: 2px; margin: 0; color: #819095; font-size: 8px; }
.analytics-summary strong { color: #2b5145; font-size: 12px; }
.text-action { padding: 2px 0; border: 0; background: transparent; color: #28715d; font-size: 9px; font-weight: 700; white-space: nowrap; }
.upcoming-panel { min-height: 270px; }
.upcoming-row { width: 100%; min-height: 48px; display: flex; align-items: center; gap: 8px; padding: 7px 0; border: 0; border-bottom: 1px solid #eef1f1; background: transparent; text-align: left; }
.upcoming-row:last-child { border-bottom: 0; }
.upcoming-row:hover .upcoming-info strong { color: #0e795a; }
.upcoming-date { width: 32px; height: 34px; flex: 0 0 auto; display: grid; align-content: center; justify-items: center; border-radius: 5px; background: #eff7f2; color: #2d7658; }
.upcoming-date b { font-size: 13px; line-height: 1.1; }
.upcoming-date small { font-size: 7px; text-transform: uppercase; }
.upcoming-info { min-width: 0; flex: 1; display: grid; gap: 4px; }
.upcoming-info strong { overflow: hidden; color: #304951; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.upcoming-info small { overflow: hidden; color: #88969b; font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.upcoming-row .event-status { padding: 3px 5px; font-size: 7px; white-space: nowrap; }
.widget-empty, .widget-error { padding: 17px 8px; color: #87949a; text-align: center; font-size: 10px; }
.widget-error { color: #964d43; }
.dashboard-rail { display: grid; gap: 11px; }
.quick-actions { padding: 13px; }
.quick-list { display: grid; gap: 5px; }
.quick-list button { width: 100%; min-height: 34px; display: flex; align-items: center; gap: 8px; padding: 0 9px; border: 1px solid #e5ecee; border-radius: 5px; background: #f9fbfc; color: #405b63; text-align: left; font-size: 9px; font-weight: 600; }
.quick-list button:hover { border-color: #b7d5c7; background: #f3faf6; }
.quick-list button > span { width: 17px; color: #26745c; text-align: center; font-size: 14px; }
.quick-list .quick-primary { border-color: #0b7659; background: #0b7659; color: #fff; }
.quick-list .quick-primary > span { color: #d7ed9f; }
.quick-list .quick-primary:hover { background: #095e49; }
.quick-list button:disabled { cursor: not-allowed; opacity: .5; }
.calendar-panel { padding: 13px; }
.admin-panel { padding: 13px; }
.admin-count { min-width: 23px; height: 23px; display: grid; place-items: center; border-radius: 50%; background: #e9f4ee; color: #26704f; font-size: 10px; font-weight: 700; }
.admin-row { display: flex; align-items: center; gap: 8px; padding: 7px 0; border-bottom: 1px solid #edf1f1; }
.admin-row > span:nth-child(2) { min-width: 0; flex: 1; display: grid; gap: 3px; }
.admin-row strong { overflow: hidden; color: #3d535a; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.admin-row small { overflow: hidden; color: #89969b; font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.admin-row > i { width: 7px; height: 7px; border-radius: 50%; background: #40a578; }
.admin-row > i.inactive { background: #c97a67; }
.admin-avatar { width: 27px; height: 27px; font-size: 10px; }
.manage-admins-btn { width: 100%; min-height: 30px; margin-top: 9px; border: 1px solid #dfe9e4; border-radius: 5px; background: #fff; color: #27624c; font-size: 9px; font-weight: 700; }
.manage-admins-btn:hover { background: #f0f7f3; }
.event-search input { width: min(230px, 100%); height: 33px; padding: 0 9px; border: 1px solid #dfe7ea; border-radius: 6px; background: #fff; color: #40545b; font-size: 9px; }
.modal-backdrop { position: fixed; z-index: 30; inset: 0; display: grid; place-items: center; padding: 20px; overflow-y: auto; background: rgb(5 29 26 / 60%); backdrop-filter: blur(3px); }
.event-details-backdrop { z-index: 31; }
.event-details-modal { width: min(660px, 100%); max-height: min(92vh, 880px); overflow-y: auto; border: 1px solid #e4ece8; border-radius: 14px; background: #fff; box-shadow: 0 24px 80px rgb(4 30 25 / 30%); }
.event-details-cover { position: relative; min-height: 210px; display: grid; place-items: center; overflow: hidden; background: radial-gradient(circle at 75% 35%, rgb(246 225 137 / 34%), transparent 17%), linear-gradient(135deg, #0a4739, #2a7950); }
.event-details-cover img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.event-details-cover::after { position: absolute; inset: 0; background: linear-gradient(180deg, rgb(5 42 32 / 12%), transparent 40%, rgb(5 42 32 / 38%)); content: ''; }
.event-details-cover-mark { color: #f0e2a1; font-size: 74px; }
.event-details-date { position: absolute; z-index: 1; bottom: 18px; left: 20px; padding: 7px 11px; border: 1px solid rgb(255 255 255 / 28%); border-radius: 5px; background: rgb(255 255 255 / 14%); color: #fff; font-size: 12px; font-weight: 700; backdrop-filter: blur(8px); }
.event-details-close { position: absolute; z-index: 2; top: 13px; right: 13px; width: 36px; height: 36px; border: 1px solid rgb(255 255 255 / 42%); border-radius: 50%; background: rgb(5 42 32 / 55%); color: white; font-size: 25px; line-height: 1; }
.event-details-close:hover { background: rgb(5 42 32 / 80%); }
.event-details-content { padding: 23px 26px 25px; }
.event-details-content h2 { margin: 8px 0 10px; color: #1c3c32; font: 600 30px/1.2 'Playfair Display', Georgia, serif; overflow-wrap: anywhere; }
.event-details-description { margin: 0; color: #6f8077; font-size: 13px; line-height: 1.7; white-space: pre-line; overflow-wrap: anywhere; }
.event-details-facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 21px; padding: 17px 0; border-top: 1px solid #e9efea; border-bottom: 1px solid #e9efea; }
.event-details-facts > div { min-width: 0; display: flex; align-items: center; gap: 11px; }
.event-details-fact-icon { width: 34px; height: 34px; flex: 0 0 auto; display: grid; place-items: center; border-radius: 8px; background: #edf6ef; color: #287451; font-size: 16px; }
.event-details-facts > div > span:last-child { min-width: 0; display: grid; gap: 4px; }
.event-details-facts small { color: #89978f; font-size: 10px; }
.event-details-facts strong { color: #334e42; font-size: 11px; font-weight: 600; line-height: 1.45; overflow-wrap: anywhere; }
.event-details-map-section { display: grid; gap: 11px; margin-top: 21px; }
.event-details-map-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.event-details-map-heading h3 { margin: 0; color: #263f35; font-size: 14px; }
.event-details-map-heading p { margin: 4px 0 0; color: #718078; font-size: 11px; line-height: 1.5; }
.event-map-provider { flex: 0 0 auto; padding: 5px 8px; border: 1px solid #dfe9e3; border-radius: 20px; color: #526e60; font-size: 9px; font-weight: 700; }
.event-details-map-missing { margin: 0; padding: 15px; border: 1px dashed #d6e2d9; border-radius: 8px; background: #f7faf7; color: #718078; font-size: 11px; line-height: 1.55; }
.event-details-directions { justify-self: start; display: inline-flex; align-items: center; gap: 8px; padding: 10px 13px; border-radius: 6px; background: #edf6ef; color: #286453; font-size: 11px; font-weight: 700; text-decoration: none; }
.event-details-directions:hover { background: #e1efe4; }
.event-details-directions span { font-size: 14px; }
.event-details-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 19px; }
.event-details-actions button { min-height: 38px; padding: 0 14px; border: 1px solid #dce7df; border-radius: 6px; background: #fff; color: #456457; font-size: 11px; font-weight: 700; }
.event-details-actions .event-details-edit { border-color: #286453; background: #286453; color: white; }
.event-details-actions button:hover { filter: brightness(.97); }
.admin-modal { width: min(640px, 100%); max-height: min(90vh, 840px); overflow-y: auto; padding: 23px; border: 1px solid #e4ece8; border-radius: 12px; background: white; box-shadow: 0 24px 80px rgb(4 30 25 / 30%); }
.admin-modal-heading { display: flex; justify-content: space-between; gap: 14px; margin-bottom: 18px; }
.admin-modal-heading h2 { margin: 0; color: #1d3835; font: 600 24px 'Playfair Display', Georgia, serif; }
.admin-modal-heading p:last-child { margin: 6px 0 0; color: #81908c; font-size: 11px; }
.admin-modal-heading > button { width: 30px; height: 30px; border: 1px solid #e4ece8; border-radius: 6px; background: #fff; color: #5a7169; font-size: 20px; }
.admin-form { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 15px; border: 1px solid #e7eeea; border-radius: 8px; background: #fbfdfb; }
.admin-form .auth-field input { height: 39px; font-size: 11px; }
.admin-form-note { grid-column: 1 / -1; margin: 0; color: #84928d; font-size: 9px; line-height: 1.5; }
.admin-form .auth-submit { grid-column: 1 / -1; min-height: 40px; margin: 0; font-size: 11px; }
.admin-modal-list { margin-top: 19px; }
.admin-modal-list h3 { display: flex; justify-content: space-between; margin: 0 0 8px; color: #35504a; font-size: 12px; }
.admin-modal-list h3 span { color: #85958e; }
.admin-list-row { display: flex; align-items: center; gap: 9px; padding: 9px 2px; border-top: 1px solid #edf1ef; }
.admin-list-details { min-width: 0; flex: 1; display: grid; gap: 3px; }
.admin-list-details strong { color: #38514b; font-size: 10px; }
.admin-list-details small { overflow: hidden; color: #899791; font-size: 9px; text-overflow: ellipsis; }
.role-badge { padding: 4px 7px; border-radius: 10px; background: #eaf5ee; color: #39805c; font-size: 8px; font-weight: 700; }
.role-badge.owner { background: #fff3da; color: #8d6a22; }
.remove-admin-btn { padding: 5px 8px; border: 1px solid #eed9d4; border-radius: 5px; background: #fff; color: #99574b; font-size: 8px; font-weight: 700; }
.remove-admin-btn:hover { background: #fff4f1; }
.admin-success { margin-bottom: 12px; padding: 10px; border: 1px solid #c5e1d0; border-radius: 6px; background: #f0f8f2; color: #276344; font-size: 11px; line-height: 1.5; }
.error-message { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 14px 0; padding: 12px; border: 1px solid #e7c3be; border-radius: 6px; background: #fbefed; color: #80392f; font-size: 13px; }
.error-message p { margin: 0; }
.error-message button { padding: 7px 11px; border: 1px solid #d8aaa3; border-radius: 4px; background: #fffaf9; color: #80392f; font-size: 12px; font-weight: 700; }
.form-panel { margin: 13px 0; }
.form-panel .event-form { max-width: 100%; }
.events-section { margin-top: 15px; padding: 18px 17px 16px; border: 1px solid #e6ecee; border-radius: 10px; background: white; box-shadow: 0 2px 9px rgb(28 54 62 / 3%); }
.section-heading { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 17px; }
.hero-management-heading { align-items: flex-start; }
.hero-slide-add { min-height: 36px; padding: 0 13px; border: 1px solid #cfe0d5; border-radius: 6px; background: #f7fbf8; color: #236449; font-size: 11px; font-weight: 700; white-space: nowrap; }
.hero-slide-add:hover { border-color: #9dc5a9; background: #edf7ef; }
.hero-slide-form { display: grid; gap: 13px; margin-bottom: 16px; padding: 16px; border: 1px solid #dfe9e1; border-radius: 8px; background: linear-gradient(145deg, #fcfefc, #f7faf7); }
.hero-slide-form-title { display: flex; align-items: center; justify-content: space-between; gap: 15px; padding-bottom: 11px; border-bottom: 1px solid #e8eee8; }
.hero-slide-form-title .eyebrow { margin-bottom: 4px; font-size: 9px; }
.hero-slide-form-title h3 { margin: 0; color: #203d32; font: 600 17px 'Playfair Display', Georgia, serif; }
.hero-slide-active { display: flex; align-items: center; gap: 7px; color: #527060; font-size: 10px; font-weight: 600; }
.hero-slide-active input { accent-color: #267451; }
.hero-slide-field { display: grid; gap: 6px; min-width: 0; color: #40564a; font-size: 10px; font-weight: 700; }
.hero-slide-field > span small { margin-left: 5px; color: #8a9690; font-size: 9px; font-weight: 400; }
.hero-slide-field input, .hero-slide-field textarea { width: 100%; min-height: 37px; padding: 8px 10px; border: 1px solid #dce5dd; border-radius: 5px; background: white; color: #263d33; font-size: 11px; font-weight: 400; }
.hero-slide-field textarea { resize: vertical; }
.hero-slide-form-row { display: grid; grid-template-columns: minmax(0, 1fr) 100px 100px; gap: 12px; }
.hero-slide-form-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 11px; border-top: 1px solid #e8eee8; }
.hero-slide-form-actions button { min-height: 35px; padding: 0 13px; border: 1px solid #d6e2d9; border-radius: 5px; background: white; color: #52665a; font-size: 10px; font-weight: 700; }
.hero-slide-form-actions .save-btn { border-color: #286453; background: #286453; color: white; }
.hero-slide-form-actions button:disabled { cursor: wait; opacity: .65; }
.hero-slide-list { display: grid; gap: 9px; }
.hero-slide-card { display: grid; grid-template-columns: 29px minmax(0, 1fr) auto auto; align-items: center; gap: 12px; padding: 10px; border: 1px solid #e6ece7; border-radius: 7px; background: white; }
.hero-slide-order { width: 26px; height: 26px; display: grid; place-items: center; border-radius: 50%; background: #edf5ef; color: #367552; font-size: 10px; font-weight: 700; }
.hero-slide-preview { min-width: 0; display: grid; gap: 3px; }
.hero-slide-preview > span { overflow: hidden; color: #31805a; font-size: 8px; font-weight: 700; letter-spacing: .8px; text-overflow: ellipsis; white-space: nowrap; }
.hero-slide-preview strong { overflow: hidden; color: #254237; font: 600 14px 'Playfair Display', Georgia, serif; text-overflow: ellipsis; white-space: nowrap; }
.hero-slide-preview small { overflow: hidden; color: #819087; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.hero-slide-card-status { display: flex; align-items: center; gap: 6px; color: #307751; font-size: 9px; font-weight: 700; }
.hero-slide-card-status i { width: 6px; height: 6px; border-radius: 50%; background: #4aab72; }
.hero-slide-card-status.inactive { color: #87918a; }
.hero-slide-card-status.inactive i { background: #aab4ad; }
.hero-slide-card-actions { display: flex; gap: 5px; }
.hero-slide-card-actions button { min-height: 29px; padding: 0 8px; border: 1px solid #dfe8e1; border-radius: 4px; background: white; color: #3e6651; font-size: 9px; font-weight: 700; }
.hero-slide-card-actions button:hover { background: #f1f8f2; }
.hero-slide-card-actions .hero-delete-action { color: #905b51; }
.hero-slide-card-actions button:disabled { cursor: wait; opacity: .6; }
.section-title-row { display: flex; align-items: center; gap: 10px; }
.section-icon { color: #155c4b; font-size: 22px; }
.section-heading h2, .recent-heading h2 { margin: 0; color: #1b3440; font: 600 18px 'Playfair Display', Georgia, serif; }
.section-heading p { margin: 4px 0 0 32px; color: #84929a; font-size: 11px; }
.schedule-controls { display: flex; align-items: center; justify-content: flex-end; gap: 7px; flex-wrap: wrap; }
.filter-pills { display: flex; gap: 5px; }
.filter-pills button { min-height: 32px; padding: 0 10px; border: 1px solid #e6ecee; border-radius: 18px; background: white; color: #667780; font-size: 10px; }
.filter-pills button.selected { border-color: #06483d; background: #06483d; color: #fff; }
.sort-select select { max-width: 166px; min-height: 33px; padding: 0 8px; border: 1px solid #dfe7ea; border-radius: 6px; background: white; color: #52656e; font-size: 10px; }
.export-btn { min-height: 33px; padding: 0 9px; border: 1px solid #dfe7ea; border-radius: 6px; background: #fff; color: #42645b; font-size: 10px; font-weight: 700; }
.export-btn:disabled { cursor: not-allowed; opacity: .5; }
.event-list { display: grid; gap: 9px; }
.event-card { min-width: 0; display: grid; grid-template-columns: 76px minmax(150px, 1fr) minmax(92px, .28fr) auto; align-items: center; gap: 15px; padding: 12px; border: 1px solid #e8edef; border-radius: 8px; background: #fff; transition: border-color .15s, box-shadow .15s; }
.event-card:hover { border-color: #bfd5cb; box-shadow: 0 5px 16px rgb(19 56 48 / 6%); }
.event-date-tile { min-height: 76px; display: grid; place-content: center; justify-items: center; gap: 1px; border-radius: 7px; background: linear-gradient(155deg, #e8f5ef, #f3f7ed); color: #26725a; }
.event-date-tile span { font-size: 9px; font-weight: 700; letter-spacing: .8px; }
.event-date-tile strong { color: #173d34; font: 700 25px 'Playfair Display', Georgia, serif; line-height: 1.1; }
.event-date-tile small { color: #768a80; font-size: 9px; }
.event-cover { width: 76px; height: 76px; overflow: hidden; border-radius: 7px; background: #e8f2eb; }
.event-cover img { width: 100%; height: 100%; object-fit: cover; }
.event-main { min-width: 0; }
.event-status { display: inline-block; padding: 3px 7px; border-radius: 10px; background: #e8f5ec; color: #268353; font-size: 9px; font-weight: 700; }
.event-status.completed { background: #f0f2f1; color: #72807a; }
.event-status.today { background: #fff2d6; color: #946913; }
.event-main h3 { margin: 5px 0 3px; color: #162f3a; font: 600 17px 'Playfair Display', Georgia, serif; overflow-wrap: anywhere; }
.description { display: -webkit-box; max-width: 540px; margin: 0; overflow: hidden; color: #77868d; font-size: 10px; line-height: 1.45; overflow-wrap: anywhere; -webkit-box-orient: vertical; -webkit-line-clamp: 1; }
.event-meta { display: flex; gap: 13px; margin-top: 9px; color: #526d79; font-size: 9px; }
.event-meta span { display: flex; align-items: center; gap: 5px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.event-meta b { color: #347763; font-size: 13px; }
.event-capacity { display: grid; gap: 3px; padding-left: 13px; border-left: 1px solid #e5ebed; }
.event-capacity > span { color: #91a0a5; font-size: 8px; font-weight: 700; letter-spacing: .8px; }
.event-capacity strong { color: #1b5b48; font-size: 15px; }
.event-capacity small { color: #87949a; font-size: 9px; }
.capacity-track { height: 5px; margin-top: 4px; overflow: hidden; border-radius: 4px; background: #e6eeeb; }
.capacity-track i { height: 100%; display: block; border-radius: inherit; background: #20815f; }
.event-actions { display: grid; gap: 5px; }
.event-actions button { min-width: 76px; min-height: 30px; padding: 0 8px; border: 1px solid #d9e6e1; border-radius: 5px; background: #fff; color: #23604f; font-size: 9px; font-weight: 700; }
.event-actions .edit-btn:hover { background: #eef7f2; }
.event-actions .delete-btn { min-height: 24px; border-color: transparent; color: #98675d; }
.event-actions .delete-btn:hover { background: #fff2ef; }
.empty-state { padding: 36px 15px; border: 1px dashed #d4e1dc; border-radius: 7px; background: #fbfdfc; color: #788780; text-align: center; }
.empty-state h3 { margin: 7px 0; color: #25423b; font: 600 19px 'Playfair Display', Georgia, serif; }
.empty-state p { margin: 0; font-size: 12px; }
.empty-calendar { color: #7bac96; font-size: 27px; }
.primary-btn, .clear-filter-btn { margin-top: 14px; padding: 10px 13px; border: 0; border-radius: 5px; background: #0b624e; color: white; font-size: 11px; font-weight: 700; }
.clear-filter-btn { border: 1px solid #dce7e2; background: white; color: #45665a; }
.loading-state { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 24px; border-style: solid; }
.loading-state p { margin: 0; }
.loading-mark { width: 16px; height: 16px; border: 2px solid #cad7cc; border-top-color: #286453; border-radius: 50%; animation: spin .7s linear infinite; }
.recent-section { margin-top: 18px; }
.recent-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 9px; }
.recent-heading h2 { font-size: 16px; }
.recent-heading button { border: 0; background: transparent; color: #28715d; font-size: 10px; font-weight: 700; }
.recent-card { display: flex; align-items: center; gap: 11px; padding: 12px; border: 1px solid #e6ecee; border-radius: 8px; background: white; }
.recent-icon { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 6px; background: #e7f2ec; color: #34775d; font-size: 18px; }
.recent-card > div { min-width: 0; }
.recent-card strong { color: #29444a; font-size: 12px; }
.recent-card p { margin: 3px 0 0; color: #849196; font-size: 10px; }
.recent-status { margin-left: auto; padding: 4px 8px; border-radius: 12px; background: #eef4f0; color: #627c6d; font-size: 9px; }
.dashboard-rail { display: grid; gap: 13px; }
.create-promo { position: relative; min-height: 148px; display: grid; grid-template-columns: 30px 1fr; align-content: start; gap: 10px; padding: 18px 17px 14px; overflow: hidden; border: 1px solid #b2d8be; border-radius: 10px; background: linear-gradient(125deg, #0d7357, #176b4d 60%, #60934e); color: white; }
.promo-icon { grid-row: span 2; font-size: 25px; }
.create-promo h2 { position: relative; z-index: 1; margin: 0; font-size: 14px; }
.create-promo p { position: relative; z-index: 1; max-width: 175px; margin: 5px 0 0; color: #d1e8dc; font-size: 10px; line-height: 1.5; }
.create-promo button { position: relative; z-index: 1; grid-column: 1 / -1; width: max-content; min-height: 31px; display: flex; align-items: center; gap: 18px; margin-top: 9px; padding: 0 11px; border: 0; border-radius: 5px; background: #fff; color: #20664e; font-size: 10px; font-weight: 700; }
.create-promo button span { font-size: 17px; }
.promo-art { position: absolute; right: 12px; bottom: 0; color: rgb(232 242 205 / 38%); font-size: 75px; transform: rotate(-17deg); }
.panel { padding: 15px; border: 1px solid #e6ecee; border-radius: 9px; background: #fff; box-shadow: 0 2px 8px rgb(28 54 62 / 3%); }
.panel-heading { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; }
.panel-heading > span { color: #26745c; font-size: 18px; }
.panel-heading h2 { margin: 0; color: #243b45; font-size: 13px; }
.quick-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.quick-grid button { min-height: 69px; display: grid; grid-template-columns: 34px 1fr; grid-template-rows: 1fr 1fr; align-items: center; gap: 0 7px; padding: 8px; border: 1px solid #e8edef; border-radius: 7px; background: #fff; text-align: left; }
.quick-grid button:hover { border-color: #bed6ca; background: #f9fcfa; }
.quick-grid button > span { grid-row: span 2; width: 33px; height: 33px; display: grid; place-items: center; border-radius: 50%; background: #eef7f1; color: #236b53; font-size: 17px; }
.quick-grid strong { align-self: end; color: #37515a; font-size: 10px; }
.quick-grid small { align-self: start; margin-top: 2px; color: #8c9a9f; font-size: 8px; }
.calendar-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.calendar-heading h2 { margin: 0; color: #2a424a; font: 600 13px 'Playfair Display', Georgia, serif; }
.calendar-heading div { display: flex; gap: 4px; }
.calendar-heading button { width: 25px; height: 25px; border: 1px solid #edf1f1; border-radius: 5px; background: #fff; color: #52666d; font-size: 18px; line-height: 1; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); justify-items: center; }
.calendar-weekdays { margin-bottom: 5px; color: #91a0a3; font-size: 9px; }
.calendar-weekdays span { padding: 5px 0; }
.calendar-dates > span { width: 100%; display: grid; place-items: center; min-height: 31px; }
.calendar-dates button { position: relative; width: 27px; height: 27px; display: grid; place-items: center; border: 0; border-radius: 50%; background: transparent; color: #5e7078; font-size: 9px; }
.calendar-dates button:hover { background: #eef6f1; }
.calendar-dates button.today { background: #0e5746; color: #fff; font-weight: 700; }
.calendar-dates button.picked { outline: 2px solid #8cc4a5; outline-offset: 1px; }
.calendar-dates button.has-event:not(.today) { color: #17684d; font-weight: 700; }
.calendar-dates button i { position: absolute; bottom: 2px; width: 3px; height: 3px; border-radius: 50%; background: #3b9b67; }
.calendar-dates button.today i { background: #f0d87d; }
.calendar-hint { display: flex; align-items: center; gap: 6px; margin: 8px 0 0; color: #879499; font-size: 9px; }
.calendar-hint > span { width: 5px; height: 5px; border-radius: 50%; background: #3b9b67; }
.calendar-hint button { margin-left: auto; border: 0; background: transparent; color: #28715d; font-size: 9px; font-weight: 700; }
.capacity-summary > strong { display: block; color: #155943; font: 600 27px 'Playfair Display', Georgia, serif; }
.capacity-summary > p { margin: 3px 0 0; color: #849196; font-size: 10px; }
.footer { min-height: 43px; display: flex; align-items: center; gap: 12px; padding: 0 22px; border-top: 1px solid #e6ecee; background: #fff; color: #829197; font-size: 9px; }
.footer strong { color: #244b3e; font-size: 11px; }
.footer-right { margin-left: auto; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; clip-path: inset(50%); }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 1180px) {
  .dashboard { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 13px; padding: 13px; }
  .dashboard-rail { grid-column: 1 / -1; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: start; }
  .event-card { grid-template-columns: 66px minmax(120px, 1fr) 80px auto; gap: 10px; }
  .event-cover { width: 66px; height: 66px; }
  .event-meta { gap: 8px; }
  .public-event-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .section-heading { align-items: flex-start; flex-direction: column; }
  .schedule-controls { width: 100%; justify-content: space-between; }
}
@media (max-width: 900px) {
  .app-shell { grid-template-columns: 76px minmax(0, 1fr); }
  .sidebar { align-items: center; padding: 17px 8px 12px; }
  .sidebar-brand { padding: 0 0 22px; }
  .sidebar-brand > span:last-child { display: none; }
  .sidebar-brand .brand-mark { width: 44px; }
  .nav-link { justify-content: center; gap: 0; padding: 0; font-size: 0; }
  .nav-link span { font-size: 19px; }
  .sidebar-note { display: none; }
  .sidebar-footer { flex-wrap: wrap; justify-content: center; }
  .sidebar-user, .signout-button { display: none; }
  .dashboard { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dashboard-rail { grid-column: 1 / -1; grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .calendar-page-day { min-height: 100px; padding: 6px; }
}
@media (max-width: 640px) {
  .auth-page { grid-template-columns: 1fr; }
  .auth-story { min-height: 240px; padding: 20px 24px; }
  .auth-story .brand-mark { width: 36px; height: 36px; font-size: 23px; }
  .auth-story h1 { margin: 18px 0 7px; font-size: 35px; }
  .auth-story-copy { margin: 28px 0 0; }
  .auth-story-copy p, .auth-footnote, .story-decoration, .guest-preview { display: none; }
  .auth-panel { padding: 38px 24px; }
  .auth-card h2 { font-size: 28px; }
  .auth-admin-note { font-size: 10px; }
  .public-topbar { height: 62px; padding: 0 15px; }
  .public-brand { gap: 8px; font-size: 17px; }
  .public-brand .brand-mark { width: 34px; height: 34px; font-size: 21px; }
  .public-topbar nav { gap: 12px; }
  .public-topbar nav a { font-size: 10px; }
  .public-topbar .public-profile-trigger { gap: 6px; padding: 3px; }
  .public-topbar .profile-trigger .account-name { display: none; }
  .public-topbar .profile-chevron { display: none; }
  .public-hero { width: calc(100% - 24px); min-height: 280px; gap: 10px; margin-top: 12px; padding: 0; border-radius: 11px; }
  .public-hero-slide { gap: 8px; padding: 26px 20px 48px; }
  .public-hero-copy { max-width: 250px; padding-bottom: 0; }
  .public-hero h1 { font-size: 36px; }
  .public-hero p { max-width: 300px; font-size: 11px; }
  .public-hero-button { gap: 15px; margin-top: 16px; padding: 10px 12px; font-size: 10px; }
  .public-hero-art { width: 105px; height: 120px; margin-right: -6px; }
  .public-hero-art strong { font-size: 17px; }
  .public-hero-art span { top: 12px; right: 15px; font-size: 17px; }
  .public-hero-art i { bottom: 10px; left: 12px; font-size: 20px; }
  .public-hero-controls { right: 17px; bottom: 12px; }
  .public-topbar nav > a:not(.public-mobile-link) { display: none; }
  .public-mobile-link { min-height: 34px; padding: 0 9px; font-size: 9px !important; }
  .public-quick-stats { width: calc(100% - 32px); grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .public-quick-stats > div { border-right: 0; }
  .public-quick-stats > div > span { display: none; }
  .public-quick-stats p { display: grid; font-size: 8px; }
  .public-quick-stats p strong { font-size: 14px; }
  .public-quick-stats > a { display: none; }
  .public-featured-section { width: calc(100% - 32px); padding-top: 36px; }
  .public-featured-heading { align-items: start; }
  .public-featured-heading h2 { font-size: 23px; }
  .public-featured-heading a { margin-top: 24px; }
  .public-featured-grid { grid-template-columns: 1fr; }
  .public-featured-card { min-height: 96px; grid-template-columns: 68px 1fr; }
  .public-app-banner { width: calc(100% - 32px); min-height: 420px; grid-template-columns: 1fr; gap: 6px; padding: 32px 24px 0; }
  .public-app-copy { align-self: start; }
  .public-app-copy h2 { font-size: 34px; }
  .public-app-copy > p { font-size: 11px; }
  .public-phone-mockup { width: 180px; height: 260px; transform: rotate(4deg) translateY(8px); }
  .public-events-section { width: calc(100% - 32px); padding: 34px 0 42px; }
  .public-section-heading { align-items: stretch; flex-direction: column; gap: 16px; }
  .public-section-heading h2 { font-size: 27px; }
  .public-search { width: 100%; }
  .public-event-summary { flex-wrap: wrap; gap: 8px 0; }
  .public-event-summary span { min-width: 72px; }
  .public-event-filters { overflow-x: auto; padding-bottom: 2px; }
  .public-event-filters button { min-height: 36px; flex: 0 0 auto; }
  .public-event-grid { grid-template-columns: 1fr; gap: 12px; }
  .public-event-art { min-height: 115px; }
  .event-details-backdrop { align-items: end; padding: 0; }
  .event-details-modal { max-height: 92vh; border-radius: 14px 14px 0 0; }
  .event-details-cover { min-height: 170px; }
  .event-details-content { padding: 19px 18px 22px; }
  .event-details-content h2 { font-size: 25px; }
  .event-details-facts { grid-template-columns: 1fr; gap: 12px; }
  .public-venues-section { width: calc(100% - 32px); grid-template-columns: 1fr; gap: 16px; }
  .public-location-list { grid-template-columns: 1fr; }
  .public-footer { grid-template-columns: 1fr 1fr; gap: 22px; padding: 30px 16px 62px; }
  .public-footer-brand { grid-column: 1 / -1; }
  .app-shell { display: block; }
  .sidebar { position: fixed; z-index: 10; top: auto; right: 0; bottom: 0; left: 0; width: 100%; height: 62px; flex-direction: row; justify-content: center; padding: 6px 12px; border-top: 1px solid rgb(255 255 255 / 12%); }
  .sidebar-brand, .sidebar-footer { display: none; }
  .side-nav { width: 100%; display: flex; justify-content: flex-start; gap: 4px; overflow-x: auto; }
  .nav-link { width: auto; min-width: 40px; min-height: 48px; flex: 1 0 40px; }
  .workspace { padding-bottom: 62px; }
  .topbar { height: 58px; gap: 9px; padding: 0 12px; }
  .top-search { width: 100%; height: 36px; }
  .top-search input { font-size: 10px; }
  .workspace-status { display: none; }
  .profile-trigger { gap: 6px; padding: 3px; }
  .profile-chevron { display: none; }
  .account-name { display: none; }
  .avatar-small { width: 31px; height: 31px; }
  .dashboard { gap: 12px; padding: 11px; }
  .dashboard { grid-template-columns: 1fr; }
  .dashboard.single-page { padding: 18px 12px 28px; }
  .dashboard-rail { grid-column: auto; grid-template-columns: 1fr; }
  .hero-banner, .full-width { grid-column: 1; }
  .hero-banner { min-height: 200px; align-items: flex-start; flex-direction: column; padding: 19px; }
  .hero-content h1 { font-size: 29px; }
  .hero-content > p:not(.hero-kicker) { max-width: 260px; font-size: 11px; }
  .hero-metrics { margin-top: 17px; }
  .hero-metrics > div { min-width: 0; grid-template-columns: 26px 1fr; gap: 0 6px; padding: 0 8px; }
  .metric-icon { width: 25px; height: 25px; font-size: 13px; }
  .hero-metrics strong { font-size: 12px; }
  .hero-metrics small { font-size: 7px; }
  .hero-create { min-height: 34px; align-self: flex-start; margin-top: 0; font-size: 10px; }
  .events-section { padding: 14px 11px; }
  .hero-management-heading { flex-direction: row; align-items: flex-start; }
  .hero-management-heading > div { min-width: 0; }
  .hero-management-heading .section-title-row { align-items: flex-start; }
  .hero-management-heading .section-title-row h2 { font-size: 16px; }
  .hero-management-heading > div > p { margin-left: 0; line-height: 1.5; }
  .hero-slide-add { min-height: 32px; padding: 0 8px; font-size: 9px; }
  .hero-slide-form { padding: 12px; }
  .hero-slide-form-title { align-items: flex-start; flex-direction: column; }
  .hero-slide-form-row { grid-template-columns: minmax(0, 1fr) 1fr; }
  .hero-slide-form-row > :first-child { grid-column: 1 / -1; }
  .hero-slide-card { grid-template-columns: 26px minmax(0, 1fr) auto; gap: 8px; }
  .hero-slide-preview strong { font-size: 12px; }
  .hero-slide-card-status { grid-column: 2; grid-row: 2; }
  .hero-slide-card-actions { grid-column: 3; grid-row: 2; }
  .hero-slide-card-actions button { padding: 0 6px; }
  .admin-modal { padding: 17px; }
  .admin-page-heading { align-items: flex-start; flex-direction: column; gap: 13px; }
  .admin-page-primary { min-height: 36px; }
  .calendar-page { padding: 14px 10px; }
  .calendar-page-weekdays span { padding: 9px 2px; font-size: 8px; }
  .calendar-page-day { min-height: 80px; gap: 3px; padding: 4px 3px; }
  .calendar-page-day-number { width: 23px; height: 23px; font-size: 9px; }
  .calendar-event-chip { padding: 4px 3px; font-size: 7px; }
  .calendar-more-events { padding-left: 2px; font-size: 7px; }
  .admin-page-panel { padding: 14px 11px; }
  .admin-page-row { gap: 8px; }
  .admin-page-role { min-width: 0; }
  .admin-page-status { font-size: 0; }
  .admin-page-status i { width: 8px; height: 8px; }
  .admin-page-row .remove-admin-btn { flex: 0 0 auto; }
  .admin-form { grid-template-columns: 1fr; }
  .admin-form-note, .admin-form .auth-submit { grid-column: 1; }
  .section-heading { gap: 12px; }
  .schedule-controls { justify-content: flex-start; }
  .filter-pills button { padding: 0 9px; }
  .sort-select select { max-width: 146px; }
  .event-card { grid-template-columns: 52px minmax(0, 1fr); gap: 9px; padding: 10px; }
  .event-date-tile { min-height: 60px; }
  .event-date-tile strong { font-size: 21px; }
  .event-cover { width: 52px; height: 60px; }
  .event-main h3 { font-size: 15px; }
  .event-meta { flex-wrap: wrap; gap: 6px 10px; }
  .event-meta span { max-width: 48%; }
  .event-capacity { grid-column: 1; padding-left: 0; border-left: 0; }
  .event-capacity .capacity-track { max-width: 46px; }
  .event-actions { grid-column: 2; grid-row: 3; grid-template-columns: 1fr 1fr; align-self: center; }
  .dashboard-rail { grid-template-columns: 1fr; }
  .calendar-panel { grid-row: auto; }
  .create-promo { min-height: 130px; }
  .footer { flex-wrap: wrap; justify-content: center; padding: 10px; }
  .footer-right { width: 100%; margin: 0; text-align: center; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; scroll-behavior: auto !important; transition-duration: .01ms !important; }
  .public-hero-dots button { transition: none; }
}
</style>
