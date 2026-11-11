import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue';
import EventForm from './components/EventForm.vue';
import EventLocationMap from './components/EventLocationMap.vue';
import { adminService } from './services/adminService';
import { authService } from './services/authService';
import { eventService } from './services/eventService';
import { heroSlideService } from './services/heroSlideService';
const user = ref(null);
const events = ref([]);
const publicEvents = ref([]);
const heroSlides = ref([]);
const heroSlidesLoaded = ref(false);
const managedHeroSlides = ref([]);
const admins = ref([]);
const loading = ref(false);
const saving = ref(false);
const signingIn = ref(false);
const sessionLoading = ref(true);
const error = ref('');
const authError = ref('');
const authSuccess = ref('');
const authMode = ref('login');
const passwordVisible = ref(false);
const confirmationPasswordVisible = ref(false);
const forgotPasswordOpen = ref(false);
const forgotPasswordEmail = ref('');
const forgotPasswordLoading = ref(false);
const forgotPasswordError = ref('');
const forgotPasswordSuccess = ref('');
const resetPasswordOpen = ref(false);
const resetPasswordLoading = ref(false);
const resetPasswordError = ref('');
const resetPasswordSuccess = ref('');
const resetPasswordToken = ref('');
const resetPasswordEmail = ref('');
const resetPasswordVisible = ref(false);
const resetConfirmationVisible = ref(false);
const resetPasswordForm = reactive({
    password: '',
    password_confirmation: '',
});
const publicLoading = ref(false);
const publicError = ref('');
const slideError = ref('');
const slideSuccess = ref('');
const slideLoading = ref(false);
const slideSaving = ref(false);
const slideEditorOpen = ref(false);
const editingSlideId = ref(null);
const slideDeleteBusy = ref(null);
const publicSearch = ref('');
const publicEventFilter = ref('all');
const adminError = ref('');
const adminSuccess = ref('');
const adminLoading = ref(false);
const adminSaving = ref(false);
const adminModalOpen = ref(false);
const search = ref('');
const dateFilter = ref('all');
const sortOrder = ref('soonest');
const portalPages = ['dashboard', 'events', 'create-event', 'calendar', 'analytics', 'homepage', 'administrators'];
const requestedPage = window.location.hash.slice(1);
const currentPage = ref(portalPages.includes(requestedPage) ? requestedPage : 'dashboard');
const selectedCalendarDate = ref('');
const calendarMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
const showForm = ref(false);
const editingEvent = ref(null);
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
})[currentPage.value]);
const selectedEventDetails = ref(null);
const eventDetailsCloseButton = ref(null);
const eventDetailsTrigger = ref(null);
const profileMenuOpen = ref(false);
const activePublicSlide = ref(0);
const isPublicHeroPaused = ref(false);
let publicEventsTimer;
let publicHeroTimer;
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
];
const slideForm = reactive({
    eyebrow: '',
    title: '',
    description: '',
    art_text: '',
    symbol: '✦',
    sort_order: 0,
    is_active: true,
});
const authForm = reactive({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
});
const adminForm = reactive({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
});
const today = dateToIso(new Date());
const calendarTitle = computed(() => calendarMonth.value.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
}));
const calendarEventsByDate = computed(() => {
    const groupedEvents = new Map();
    events.value.forEach((event) => {
        const date = String(event.event_date).slice(0, 10);
        const eventsOnDate = groupedEvents.get(date) || [];
        eventsOnDate.push(event);
        groupedEvents.set(date, eventsOnDate);
    });
    return groupedEvents;
});
const calendarDays = computed(() => {
    const year = calendarMonth.value.getFullYear();
    const month = calendarMonth.value.getMonth();
    const offset = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let index = 0; index < offset; index += 1) {
        days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
        const isoDate = dateToIso(new Date(year, month, day));
        days.push({
            day,
            isoDate,
            isToday: isoDate === today,
            hasEvent: events.value.some((event) => String(event.event_date).slice(0, 10) === isoDate),
        });
    }
    return days;
});
const filteredEvents = computed(() => {
    const term = search.value.trim().toLowerCase();
    return events.value
        .filter((event) => {
        const eventDate = String(event.event_date).slice(0, 10);
        const searchableText = [event.title, event.location, event.organizer, event.description]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
        const matchesSearch = !term || searchableText.includes(term);
        const matchesDate = selectedCalendarDate.value
            ? eventDate === selectedCalendarDate.value
            : dateFilter.value === 'all'
                || (dateFilter.value === 'upcoming' && eventDate >= today)
                || (dateFilter.value === 'past' && eventDate < today);
        return matchesSearch && matchesDate;
    })
        .sort((left, right) => {
        const dateOrder = String(left.event_date).localeCompare(String(right.event_date))
            || String(left.event_time || '').localeCompare(String(right.event_time || ''));
        return sortOrder.value === 'soonest' ? dateOrder : -dateOrder;
    });
});
const upcomingEvents = computed(() => events.value
    .filter((event) => String(event.event_date).slice(0, 10) >= today)
    .sort((left, right) => String(left.event_date).localeCompare(String(right.event_date))));
const upcomingCount = computed(() => upcomingEvents.value.length);
const publicHeroSlides = computed(() => {
    if (!heroSlidesLoaded.value)
        return defaultPublicHeroSlides;
    const activeSlides = (Array.isArray(heroSlides.value) ? heroSlides.value : [])
        .filter((slide) => slide.is_active)
        .sort((left, right) => left.sort_order - right.sort_order || left.id - right.id);
    return activeSlides.map((slide) => ({
        kicker: slide.eyebrow,
        title: slide.title.split('|').map((line) => line.trim()).filter(Boolean),
        description: slide.description,
        art: slide.art_text.split('|').map((line) => line.trim()).filter(Boolean),
        symbol: slide.symbol,
    }));
});
const publicUpcomingEvents = computed(() => publicEvents.value
    .filter((event) => String(event.event_date).slice(0, 10) >= today)
    .sort((left, right) => String(left.event_date).localeCompare(String(right.event_date))));
const publicPastEvents = computed(() => publicEvents.value
    .filter((event) => String(event.event_date).slice(0, 10) < today)
    .sort((left, right) => String(right.event_date).localeCompare(String(left.event_date))));
const publicFilteredEvents = computed(() => {
    if (publicEventFilter.value === 'upcoming')
        return publicUpcomingEvents.value;
    if (publicEventFilter.value === 'past')
        return publicPastEvents.value;
    return [...publicUpcomingEvents.value, ...publicPastEvents.value];
});
const visiblePublicEvents = computed(() => {
    const term = publicSearch.value.trim().toLowerCase();
    return publicFilteredEvents.value.filter((event) => !term || [event.title, event.location, event.organizer, event.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term));
});
const featuredPublicEvents = computed(() => publicUpcomingEvents.value.slice(0, 3));
const publicVenueCount = computed(() => new Set(publicEvents.value.map((event) => String(event.location || '').trim()).filter(Boolean)).size);
const publicLocations = computed(() => [...new Set(publicEvents.value.map((event) => String(event.location || '').trim()).filter(Boolean))].slice(0, 6));
const currentYear = computed(() => new Date().getFullYear());
const totalCapacity = computed(() => events.value.reduce((total, event) => total + Number(event.capacity || 0), 0));
const eventWeek = computed(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - 6 + index);
    const isoDate = dateToIso(date);
    const count = events.value.filter((event) => String(event.created_at || '').slice(0, 10) === isoDate).length;
    return {
        date: isoDate,
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        count,
    };
}));
const maxWeekCount = computed(() => Math.max(1, ...eventWeek.value.map((day) => day.count)));
function dateToIso(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function getErrorMessage(err) {
    if (err.message?.startsWith('Eventlist API is not configured.')) {
        return err.message;
    }
    if (err.response?.status === 429) {
        const retryAfter = Number(err.response.headers?.['retry-after']);
        if (Number.isFinite(retryAfter) && retryAfter > 0) {
            return `Too many password attempts. Please wait ${retryAfter} seconds before trying again.`;
        }
        return 'Too many password attempts. Please wait a minute before trying again.';
    }
    if (err.response?.status === 422) {
        const errors = err.response.data.errors || {};
        return Object.values(errors).flat().join(' ')
            || 'Please check the information you entered.';
    }
    if (!err.response) {
        return 'Cannot connect to the server. Check your connection and try again.';
    }
    return err.response.data?.message || 'Something went wrong. Please try again.';
}
async function loadEvents() {
    loading.value = true;
    error.value = '';
    try {
        events.value = await eventService.getAll();
    }
    catch (err) {
        if (err.response?.status === 401) {
            authService.clearToken();
            user.value = null;
            events.value = [];
            authError.value = 'Your session expired. Please sign in again.';
            return;
        }
        error.value = getErrorMessage(err);
    }
    finally {
        loading.value = false;
    }
}
async function loadPublicEvents() {
    if (publicLoading.value)
        return;
    publicLoading.value = true;
    publicError.value = '';
    try {
        publicEvents.value = await eventService.getPublic();
    }
    catch (err) {
        publicError.value = getErrorMessage(err);
    }
    finally {
        publicLoading.value = false;
    }
}
function shouldRefreshPublicEvents() {
    return !user.value || user.value.role === 'user';
}
function refreshPublicContentWhenVisible() {
    if (document.visibilityState === 'visible' && shouldRefreshPublicEvents()) {
        loadPublicEvents();
        loadPublicHeroSlides();
    }
}
function isNewAnnouncement(event) {
    if (!event.created_at)
        return false;
    const createdAt = new Date(event.created_at).getTime();
    const age = Date.now() - createdAt;
    return Number.isFinite(createdAt) && age >= 0 && age < 7 * 24 * 60 * 60 * 1000;
}
function changePublicSlide(offset) {
    const slideCount = publicHeroSlides.value.length;
    if (!slideCount)
        return;
    activePublicSlide.value = (activePublicSlide.value + offset + slideCount) % slideCount;
}
function slideLines(value) {
    return String(value || '').split('|').map((line) => line.trim()).filter(Boolean);
}
function pausePublicHero() {
    isPublicHeroPaused.value = true;
    window.clearInterval(publicHeroTimer);
}
function resumePublicHero() {
    isPublicHeroPaused.value = false;
    window.clearInterval(publicHeroTimer);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        publicHeroTimer = window.setInterval(() => changePublicSlide(1), 6500);
    }
}
async function loadPublicHeroSlides() {
    try {
        heroSlides.value = await heroSlideService.getPublic();
        heroSlidesLoaded.value = true;
        if (activePublicSlide.value >= publicHeroSlides.value.length)
            activePublicSlide.value = 0;
    }
    catch (err) {
        slideError.value = getErrorMessage(err);
    }
}
async function loadManagedHeroSlides() {
    slideLoading.value = true;
    slideError.value = '';
    try {
        managedHeroSlides.value = await heroSlideService.getAll();
    }
    catch (err) {
        slideError.value = getErrorMessage(err);
    }
    finally {
        slideLoading.value = false;
    }
}
async function loadAdmins() {
    if (user.value?.role !== 'owner') {
        admins.value = [];
        return;
    }
    adminLoading.value = true;
    adminError.value = '';
    try {
        admins.value = await adminService.getAll();
    }
    catch (err) {
        adminError.value = getErrorMessage(err);
    }
    finally {
        adminLoading.value = false;
    }
}
function openForgotPassword() {
    forgotPasswordEmail.value = authForm.email;
    forgotPasswordError.value = '';
    forgotPasswordSuccess.value = '';
    forgotPasswordOpen.value = true;
}
function closeForgotPassword() {
    if (!forgotPasswordLoading.value) {
        forgotPasswordOpen.value = false;
    }
}
async function submitForgotPassword() {
    forgotPasswordLoading.value = true;
    forgotPasswordError.value = '';
    forgotPasswordSuccess.value = '';
    try {
        const response = await authService.forgotPassword(forgotPasswordEmail.value);
        forgotPasswordSuccess.value = response.message;
    }
    catch (err) {
        forgotPasswordError.value = getErrorMessage(err);
    }
    finally {
        forgotPasswordLoading.value = false;
    }
}
function closeResetPassword() {
    resetPasswordOpen.value = false;
    resetPasswordError.value = '';
    const url = new URL(window.location.href);
    url.searchParams.delete('reset_token');
    url.searchParams.delete('email');
    window.history.replaceState({}, '', url.pathname + url.hash);
}
async function submitResetPassword() {
    resetPasswordLoading.value = true;
    resetPasswordError.value = '';
    resetPasswordSuccess.value = '';
    try {
        const response = await authService.resetPassword({
            email: resetPasswordEmail.value,
            token: resetPasswordToken.value,
            password: resetPasswordForm.password,
            password_confirmation: resetPasswordForm.password_confirmation,
        });
        resetPasswordSuccess.value = response.message;
        resetPasswordForm.password = '';
        resetPasswordForm.password_confirmation = '';
    }
    catch (err) {
        resetPasswordError.value = getErrorMessage(err);
    }
    finally {
        resetPasswordLoading.value = false;
    }
}
async function submitAuth() {
    signingIn.value = true;
    authError.value = '';
    authSuccess.value = '';
    const creatingAccount = authMode.value === 'register';
    try {
        const response = creatingAccount
            ? await authService.register({ ...authForm })
            : await authService.login({
                email: authForm.email,
                password: authForm.password,
            });
        authService.setToken(response.token);
        user.value = response.user;
        restorePortalPage();
        authForm.password = '';
        authForm.password_confirmation = '';
        authSuccess.value = creatingAccount ? 'Your account is ready. Welcome to Eventlist!' : '';
        if (user.value.role === 'owner' || user.value.role === 'admin') {
            await Promise.all([loadEvents(), loadAdmins(), loadPublicHeroSlides(), loadManagedHeroSlides()]);
        }
        else {
            events.value = [];
            admins.value = [];
            await Promise.all([loadPublicEvents(), loadPublicHeroSlides()]);
        }
    }
    catch (err) {
        authError.value = getErrorMessage(err);
    }
    finally {
        signingIn.value = false;
    }
}
async function signOut() {
    profileMenuOpen.value = false;
    try {
        await authService.logout();
        authService.clearToken();
        user.value = null;
        events.value = [];
        admins.value = [];
        managedHeroSlides.value = [];
        authForm.password = '';
        authForm.password_confirmation = '';
        setAuthMode('login');
        await loadPublicEvents();
    }
    catch (err) {
        if (err.response?.status === 401) {
            authService.clearToken();
            user.value = null;
            events.value = [];
            admins.value = [];
            managedHeroSlides.value = [];
            authForm.password = '';
            authForm.password_confirmation = '';
            setAuthMode('login');
            await loadPublicEvents();
            return;
        }
        error.value = getErrorMessage(err);
    }
}
async function initializeSession() {
    if (authService.getToken()) {
        try {
            user.value = await authService.currentUser();
            restorePortalPage();
            if (user.value.role === 'owner' || user.value.role === 'admin') {
                await Promise.all([loadEvents(), loadAdmins(), loadPublicHeroSlides(), loadManagedHeroSlides()]);
            }
            else {
                await Promise.all([loadPublicEvents(), loadPublicHeroSlides()]);
            }
        }
        catch (err) {
            authService.clearToken();
            if (err.response?.status !== 401) {
                authError.value = getErrorMessage(err);
            }
            await Promise.all([loadPublicEvents(), loadPublicHeroSlides()]);
        }
    }
    else {
        await Promise.all([loadPublicEvents(), loadPublicHeroSlides()]);
    }
    sessionLoading.value = false;
}
function setAuthMode(mode) {
    authMode.value = mode;
    authError.value = '';
    authSuccess.value = '';
}
function resetSlideForm() {
    editingSlideId.value = null;
    Object.assign(slideForm, {
        eyebrow: '',
        title: '',
        description: '',
        art_text: '',
        symbol: '✦',
        sort_order: managedHeroSlides.value.length,
        is_active: true,
    });
}
function openCreateSlideForm() {
    resetSlideForm();
    slideEditorOpen.value = true;
    slideError.value = '';
    slideSuccess.value = '';
}
function editHeroSlide(slide) {
    editingSlideId.value = slide.id;
    Object.assign(slideForm, {
        eyebrow: slide.eyebrow,
        title: slide.title,
        description: slide.description,
        art_text: slide.art_text,
        symbol: slide.symbol,
        sort_order: slide.sort_order,
        is_active: slide.is_active,
    });
    slideEditorOpen.value = true;
    slideError.value = '';
    slideSuccess.value = '';
    scrollToSection('hero-slides');
}
function closeSlideForm() {
    slideEditorOpen.value = false;
    resetSlideForm();
}
async function saveHeroSlide() {
    slideSaving.value = true;
    slideError.value = '';
    slideSuccess.value = '';
    try {
        const savedSlide = editingSlideId.value
            ? await heroSlideService.update(editingSlideId.value, { ...slideForm })
            : await heroSlideService.create({ ...slideForm });
        const existingIndex = managedHeroSlides.value.findIndex((slide) => slide.id === savedSlide.id);
        if (existingIndex < 0) {
            managedHeroSlides.value = [...managedHeroSlides.value, savedSlide];
        }
        else {
            managedHeroSlides.value.splice(existingIndex, 1, savedSlide);
        }
        managedHeroSlides.value.sort((left, right) => left.sort_order - right.sort_order || left.id - right.id);
        slideSuccess.value = `“${savedSlide.eyebrow}” ${editingSlideId.value ? 'updated' : 'created'} successfully.`;
        await loadPublicHeroSlides();
        closeSlideForm();
    }
    catch (err) {
        slideError.value = getErrorMessage(err);
    }
    finally {
        slideSaving.value = false;
    }
}
async function toggleHeroSlide(slide) {
    slideError.value = '';
    slideSuccess.value = '';
    try {
        const updated = await heroSlideService.update(slide.id, { ...slide, is_active: !slide.is_active });
        const index = managedHeroSlides.value.findIndex((item) => item.id === slide.id);
        if (index >= 0)
            managedHeroSlides.value.splice(index, 1, updated);
        slideSuccess.value = `${updated.eyebrow} is now ${updated.is_active ? 'visible' : 'hidden'} on the public homepage.`;
        await loadPublicHeroSlides();
    }
    catch (err) {
        slideError.value = getErrorMessage(err);
    }
}
async function deleteHeroSlide(slide) {
    if (!window.confirm(`Delete “${slide.eyebrow}” from the public carousel?`))
        return;
    slideDeleteBusy.value = slide.id;
    slideError.value = '';
    slideSuccess.value = '';
    try {
        await heroSlideService.delete(slide.id);
        managedHeroSlides.value = managedHeroSlides.value.filter((item) => item.id !== slide.id);
        slideSuccess.value = 'Homepage slide deleted.';
        if (editingSlideId.value === slide.id)
            closeSlideForm();
        await loadPublicHeroSlides();
    }
    catch (err) {
        slideError.value = getErrorMessage(err);
    }
    finally {
        slideDeleteBusy.value = null;
    }
}
function openCreateForm() {
    editingEvent.value = null;
    showForm.value = true;
    error.value = '';
    navigateToPage('create-event');
}
function openEditForm(event) {
    editingEvent.value = { ...event };
    showForm.value = true;
    error.value = '';
    navigateToPage('create-event');
}
function cancelEventForm() {
    showForm.value = false;
    editingEvent.value = null;
    navigateToPage('events');
}
async function openEventDetails(event, trigger) {
    eventDetailsTrigger.value = trigger;
    selectedEventDetails.value = event;
    await nextTick();
    eventDetailsCloseButton.value?.focus();
}
function hasPreciseEventLocation(event) {
    return event?.latitude !== null && event?.latitude !== undefined
        && event?.longitude !== null && event?.longitude !== undefined
        && Number.isFinite(Number(event.latitude)) && Number.isFinite(Number(event.longitude));
}
function getEventDirectionsUrl(event) {
    const destination = hasPreciseEventLocation(event)
        ? `${event.latitude},${event.longitude}`
        : event.location;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}
function closeEventDetails() {
    const trigger = eventDetailsTrigger.value;
    selectedEventDetails.value = null;
    eventDetailsTrigger.value = null;
    nextTick(() => trigger?.focus());
}
function editEventFromDetails() {
    const event = selectedEventDetails.value;
    closeEventDetails();
    if (event)
        openEditForm(event);
}
async function saveEvent(formData) {
    saving.value = true;
    error.value = '';
    try {
        if (editingEvent.value) {
            await eventService.update(editingEvent.value.id, formData);
        }
        else {
            await eventService.create(formData);
        }
        showForm.value = false;
        editingEvent.value = null;
        navigateToPage('events');
        await loadEvents();
    }
    catch (err) {
        error.value = getErrorMessage(err);
    }
    finally {
        saving.value = false;
    }
}
async function deleteEvent(event) {
    if (!window.confirm(`Delete "${event.title}"? This cannot be undone.`)) {
        return;
    }
    error.value = '';
    try {
        await eventService.delete(event.id);
        events.value = events.value.filter((item) => item.id !== event.id);
    }
    catch (err) {
        error.value = getErrorMessage(err);
    }
}
function exportEvents() {
    const headers = ['Title', 'Date', 'Time', 'Location', 'Organizer', 'Capacity', 'Description'];
    const rows = filteredEvents.value.map((event) => [
        event.title,
        String(event.event_date).slice(0, 10),
        event.event_time || '',
        event.location,
        event.organizer || '',
        event.capacity,
        event.description || '',
    ]);
    const csv = [headers, ...rows]
        .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'eventlist-events.csv';
    link.click();
    URL.revokeObjectURL(url);
}
function changeMonth(offset) {
    const nextMonth = new Date(calendarMonth.value);
    nextMonth.setMonth(nextMonth.getMonth() + offset);
    calendarMonth.value = nextMonth;
}
function selectCalendarDate(date) {
    selectedCalendarDate.value = selectedCalendarDate.value === date ? '' : date;
    dateFilter.value = 'all';
    navigateToPage('events');
}
function scrollToSection(id) {
    const pageBySection = {
        home: 'dashboard',
        overview: 'analytics',
        events: 'events',
        calendar: 'calendar',
        'hero-slides': 'homepage',
        admins: 'administrators',
    };
    navigateToPage(pageBySection[id] || 'dashboard');
}
function navigateToPage(page) {
    if (!portalPages.includes(page) || (page === 'administrators' && user.value?.role !== 'owner')) {
        page = 'dashboard';
    }
    currentPage.value = page;
    if (page !== 'create-event') {
        showForm.value = false;
        editingEvent.value = null;
    }
    if (page === 'administrators' && user.value?.role === 'owner') {
        loadAdmins();
    }
    if (window.location.hash !== `#${page}`) {
        window.history.pushState(null, '', `#${page}`);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
function restorePortalPage() {
    const requested = window.location.hash.slice(1);
    const page = portalPages.includes(requested) ? requested : 'dashboard';
    currentPage.value = page === 'administrators' && user.value?.role !== 'owner' ? 'dashboard' : page;
    showForm.value = currentPage.value === 'create-event';
    if (!showForm.value)
        editingEvent.value = null;
}
function formatDate(value, options = { year: 'numeric', month: 'short', day: 'numeric' }) {
    if (!value)
        return 'No date';
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-US', options);
}
function searchPublicByLocation(location) {
    publicSearch.value = location;
    publicEventFilter.value = 'all';
    document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth' });
}
function formatTime(value) {
    if (!value)
        return 'Time not set';
    const [hours, minutes] = value.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
function eventStatus(event) {
    const eventDate = String(event.event_date).slice(0, 10);
    return eventDate < today ? 'Completed' : eventDate === today ? 'Today' : 'Upcoming';
}
function openAdminModal() {
    adminModalOpen.value = true;
    adminError.value = '';
    adminSuccess.value = '';
    loadAdmins();
}
function closeAdminModal() {
    adminModalOpen.value = false;
    adminError.value = '';
    adminSuccess.value = '';
}
async function createAdmin() {
    adminSaving.value = true;
    adminError.value = '';
    adminSuccess.value = '';
    try {
        const admin = await adminService.create({ ...adminForm });
        admins.value = [...admins.value, admin];
        adminSuccess.value = `${admin.name} can now sign in with the password you set. Share it with them securely.`;
        adminForm.name = '';
        adminForm.email = '';
        adminForm.password = '';
        adminForm.password_confirmation = '';
    }
    catch (err) {
        adminError.value = getErrorMessage(err);
    }
    finally {
        adminSaving.value = false;
    }
}
async function removeAdmin(admin) {
    if (!window.confirm(`Remove admin access for ${admin.name}? They will no longer be able to sign in.`)) {
        return;
    }
    adminError.value = '';
    adminSuccess.value = '';
    try {
        await adminService.delete(admin.id);
        admins.value = admins.value.filter((item) => item.id !== admin.id);
        adminSuccess.value = `${admin.name} no longer has portal access.`;
    }
    catch (err) {
        adminError.value = getErrorMessage(err);
    }
}
onMounted(() => {
    window.addEventListener('popstate', restorePortalPage);
    initializeSession();
    const resetParams = new URLSearchParams(window.location.search);
    resetPasswordToken.value = resetParams.get('reset_token') || '';
    resetPasswordEmail.value = resetParams.get('email') || '';
    resetPasswordOpen.value = Boolean(resetPasswordToken.value && resetPasswordEmail.value);
    resumePublicHero();
    publicEventsTimer = window.setInterval(() => {
        if (shouldRefreshPublicEvents()) {
            loadPublicEvents();
            loadPublicHeroSlides();
        }
    }, 30000);
    window.addEventListener('focus', refreshPublicContentWhenVisible);
    document.addEventListener('visibilitychange', refreshPublicContentWhenVisible);
});
onUnmounted(() => {
    window.removeEventListener('popstate', restorePortalPage);
    window.clearInterval(publicEventsTimer);
    window.clearInterval(publicHeroTimer);
    window.removeEventListener('focus', refreshPublicContentWhenVisible);
    document.removeEventListener('visibilitychange', refreshPublicContentWhenVisible);
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
if (__VLS_ctx.sessionLoading) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "session-loading" },
        role: "status",
    });
    /** @type {__VLS_StyleScopedClasses['session-loading']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "brand-mark" },
    });
    /** @type {__VLS_StyleScopedClasses['brand-mark']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
}
else if (!__VLS_ctx.user) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.main, __VLS_intrinsics.main)({
        ...{ class: "auth-page" },
    });
    /** @type {__VLS_StyleScopedClasses['auth-page']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "auth-story" },
    });
    /** @type {__VLS_StyleScopedClasses['auth-story']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
        ...{ class: "auth-brand" },
        href: "/",
        'aria-label': "Eventlist home",
    });
    /** @type {__VLS_StyleScopedClasses['auth-brand']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "brand-mark" },
    });
    /** @type {__VLS_StyleScopedClasses['brand-mark']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "auth-story-copy" },
    });
    /** @type {__VLS_StyleScopedClasses['auth-story-copy']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "story-kicker" },
    });
    /** @type {__VLS_StyleScopedClasses['story-kicker']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.br)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "story-decoration" },
        'aria-hidden': "true",
    });
    /** @type {__VLS_StyleScopedClasses['story-decoration']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "decoration-orbit orbit-one" },
    });
    /** @type {__VLS_StyleScopedClasses['decoration-orbit']} */ ;
    /** @type {__VLS_StyleScopedClasses['orbit-one']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "decoration-orbit orbit-two" },
    });
    /** @type {__VLS_StyleScopedClasses['decoration-orbit']} */ ;
    /** @type {__VLS_StyleScopedClasses['orbit-two']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "decoration-calendar" },
    });
    /** @type {__VLS_StyleScopedClasses['decoration-calendar']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "decoration-spark" },
    });
    /** @type {__VLS_StyleScopedClasses['decoration-spark']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "guest-preview" },
    });
    /** @type {__VLS_StyleScopedClasses['guest-preview']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "guest-preview-heading" },
    });
    /** @type {__VLS_StyleScopedClasses['guest-preview-heading']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.publicUpcomingEvents.length);
    if (__VLS_ctx.publicLoading) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "guest-preview-empty" },
        });
        /** @type {__VLS_StyleScopedClasses['guest-preview-empty']} */ ;
    }
    else if (__VLS_ctx.publicError) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "guest-preview-empty" },
        });
        /** @type {__VLS_StyleScopedClasses['guest-preview-empty']} */ ;
        (__VLS_ctx.publicError);
    }
    else if (!__VLS_ctx.publicUpcomingEvents.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "guest-preview-empty" },
        });
        /** @type {__VLS_StyleScopedClasses['guest-preview-empty']} */ ;
    }
    for (const [event] of __VLS_vFor((__VLS_ctx.publicUpcomingEvents.slice(0, 2)))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
            key: (`guest-${event.id}`),
            ...{ class: "guest-preview-event" },
        });
        /** @type {__VLS_StyleScopedClasses['guest-preview-event']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "guest-preview-date" },
        });
        /** @type {__VLS_StyleScopedClasses['guest-preview-date']} */ ;
        (__VLS_ctx.formatDate(event.event_date, { month: 'short', day: 'numeric' }));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        (event.title);
        __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
        (event.location);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            'aria-hidden': "true",
        });
        // @ts-ignore
        [sessionLoading, user, publicUpcomingEvents, publicUpcomingEvents, publicUpcomingEvents, publicLoading, publicError, publicError, formatDate,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "auth-footnote" },
    });
    /** @type {__VLS_StyleScopedClasses['auth-footnote']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "auth-panel" },
    });
    /** @type {__VLS_StyleScopedClasses['auth-panel']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "auth-card" },
    });
    /** @type {__VLS_StyleScopedClasses['auth-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "eyebrow" },
    });
    /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    (__VLS_ctx.authMode === 'register' ? 'Create your account' : 'Welcome back');
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "auth-subtitle" },
    });
    /** @type {__VLS_StyleScopedClasses['auth-subtitle']} */ ;
    (__VLS_ctx.authMode === 'register' ? 'Join the community and find events worth showing up for.' : 'Sign in to discover events or continue to your workspace.');
    if (__VLS_ctx.authError) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "auth-error" },
            role: "alert",
        });
        /** @type {__VLS_StyleScopedClasses['auth-error']} */ ;
        (__VLS_ctx.authError);
    }
    if (__VLS_ctx.authSuccess) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "auth-success" },
            role: "status",
        });
        /** @type {__VLS_StyleScopedClasses['auth-success']} */ ;
        (__VLS_ctx.authSuccess);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)({
        ...{ onSubmit: (__VLS_ctx.submitAuth) },
        ...{ class: "auth-form" },
    });
    /** @type {__VLS_StyleScopedClasses['auth-form']} */ ;
    if (__VLS_ctx.authMode === 'register') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
            ...{ class: "auth-field" },
        });
        /** @type {__VLS_StyleScopedClasses['auth-field']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            value: (__VLS_ctx.authForm.name),
            type: "text",
            autocomplete: "name",
            maxlength: "255",
            placeholder: "Your full name",
            required: true,
        });
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "auth-field" },
    });
    /** @type {__VLS_StyleScopedClasses['auth-field']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "email",
        autocomplete: "email",
        maxlength: "255",
        placeholder: "you@example.com",
        required: true,
    });
    (__VLS_ctx.authForm.email);
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "auth-field" },
    });
    /** @type {__VLS_StyleScopedClasses['auth-field']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "password-label-row" },
    });
    /** @type {__VLS_StyleScopedClasses['password-label-row']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    if (__VLS_ctx.authMode === 'login') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.openForgotPassword) },
            ...{ class: "forgot-password-link" },
            type: "button",
        });
        /** @type {__VLS_StyleScopedClasses['forgot-password-link']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "password-input-wrap" },
    });
    /** @type {__VLS_StyleScopedClasses['password-input-wrap']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: (__VLS_ctx.passwordVisible ? 'text' : 'password'),
        autocomplete: (__VLS_ctx.authMode === 'register' ? 'new-password' : 'current-password'),
        minlength: (__VLS_ctx.authMode === 'register' ? 8 : undefined),
        placeholder: "At least 8 characters",
        required: true,
    });
    (__VLS_ctx.authForm.password);
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.sessionLoading))
                    throw 0;
                if (!(!__VLS_ctx.user))
                    throw 0;
                return (__VLS_ctx.passwordVisible = !__VLS_ctx.passwordVisible);
                // @ts-ignore
                [authMode, authMode, authMode, authMode, authMode, authMode, authError, authError, authSuccess, authSuccess, submitAuth, authForm, authForm, authForm, openForgotPassword, passwordVisible, passwordVisible, passwordVisible,];
            } },
        ...{ class: "password-toggle" },
        type: "button",
        'aria-label': (__VLS_ctx.passwordVisible ? 'Hide password' : 'Show password'),
        title: (__VLS_ctx.passwordVisible ? 'Hide password' : 'Show password'),
    });
    /** @type {__VLS_StyleScopedClasses['password-toggle']} */ ;
    if (__VLS_ctx.passwordVisible) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
            viewBox: "0 0 24 24",
            'aria-hidden': "true",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
            d: "M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.4 4.3A10.8 10.8 0 0112 4c5.5 0 9 4.8 9 8-0.2 1.3-0.9 2.7-1.9 3.8M6.2 6.2C4.2 7.6 3.1 9.6 3 12c0 3.2 3.5 8 9 8 1.2 0 2.4-0.2 3.4-0.7",
        });
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
            viewBox: "0 0 24 24",
            'aria-hidden': "true",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
            d: "M3 12s3.5-8 9-8 9 8 9 8-3.5 8-9 8-9-8-9-8zM12 15a3 3 0 100-6 3 3 0 000 6z",
        });
    }
    if (__VLS_ctx.authMode === 'register') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
            ...{ class: "auth-field" },
        });
        /** @type {__VLS_StyleScopedClasses['auth-field']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "password-input-wrap" },
        });
        /** @type {__VLS_StyleScopedClasses['password-input-wrap']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            type: (__VLS_ctx.confirmationPasswordVisible ? 'text' : 'password'),
            autocomplete: "new-password",
            minlength: "8",
            placeholder: "Enter your password again",
            required: true,
        });
        (__VLS_ctx.authForm.password_confirmation);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.sessionLoading))
                        throw 0;
                    if (!(!__VLS_ctx.user))
                        throw 0;
                    if (!(__VLS_ctx.authMode === 'register'))
                        throw 0;
                    return (__VLS_ctx.confirmationPasswordVisible = !__VLS_ctx.confirmationPasswordVisible);
                    // @ts-ignore
                    [authMode, authForm, passwordVisible, passwordVisible, passwordVisible, confirmationPasswordVisible, confirmationPasswordVisible, confirmationPasswordVisible,];
                } },
            ...{ class: "password-toggle" },
            type: "button",
            'aria-label': (__VLS_ctx.confirmationPasswordVisible ? 'Hide password confirmation' : 'Show password confirmation'),
        });
        /** @type {__VLS_StyleScopedClasses['password-toggle']} */ ;
        if (__VLS_ctx.confirmationPasswordVisible) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
                viewBox: "0 0 24 24",
                'aria-hidden': "true",
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
                d: "M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.4 4.3A10.8 10.8 0 0112 4c5.5 0 9 4.8 9 8-.2 1.3-.9 2.7-1.9 3.8M6.2 6.2C4.2 7.6 3.1 9.6 3 12c0 3.2 3.5 8 9 8 1.2 0 2.4-.2 3.4-.7",
            });
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
                viewBox: "0 0 24 24",
                'aria-hidden': "true",
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
                d: "M3 12s3.5-8 9-8 9 8 9 8-3.5 8-9 8-9-8-9-8zM12 15a3 3 0 100-6 3 3 0 000 6z",
            });
        }
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ class: "auth-submit" },
        type: "submit",
        disabled: (__VLS_ctx.signingIn),
    });
    /** @type {__VLS_StyleScopedClasses['auth-submit']} */ ;
    (__VLS_ctx.signingIn ? (__VLS_ctx.authMode === 'register' ? 'Creating account…' : 'Signing in…') : (__VLS_ctx.authMode === 'register' ? 'Create account' : 'Sign in'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        'aria-hidden': "true",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "auth-switch" },
    });
    /** @type {__VLS_StyleScopedClasses['auth-switch']} */ ;
    (__VLS_ctx.authMode === 'register' ? 'Already have an account?' : 'New to Eventlist?');
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.sessionLoading))
                    throw 0;
                if (!(!__VLS_ctx.user))
                    throw 0;
                return (__VLS_ctx.setAuthMode(__VLS_ctx.authMode === 'register' ? 'login' : 'register'));
                // @ts-ignore
                [authMode, authMode, authMode, authMode, confirmationPasswordVisible, confirmationPasswordVisible, signingIn, signingIn, setAuthMode,];
            } },
        type: "button",
    });
    (__VLS_ctx.authMode === 'register' ? 'Sign in' : 'Create an account');
    __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
        ...{ class: "auth-mobile-app" },
        href: "/eventlist-app-debug.apk",
        download: "Eventlist-app-debug.apk",
    });
    /** @type {__VLS_StyleScopedClasses['auth-mobile-app']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        'aria-hidden': "true",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "auth-admin-note" },
    });
    /** @type {__VLS_StyleScopedClasses['auth-admin-note']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "auth-legal" },
    });
    /** @type {__VLS_StyleScopedClasses['auth-legal']} */ ;
}
else if (__VLS_ctx.user.role === 'user') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.main, __VLS_intrinsics.main)({
        ...{ class: "public-home" },
    });
    /** @type {__VLS_StyleScopedClasses['public-home']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({
        ...{ class: "public-topbar" },
    });
    /** @type {__VLS_StyleScopedClasses['public-topbar']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
        ...{ class: "public-brand" },
        href: "#discover",
    });
    /** @type {__VLS_StyleScopedClasses['public-brand']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "brand-mark" },
    });
    /** @type {__VLS_StyleScopedClasses['brand-mark']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.nav, __VLS_intrinsics.nav)({
        'aria-label': "Public navigation",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
        href: "#discover",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
        href: "#upcoming",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
        href: "#venues",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
        href: "#about",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
        ...{ class: "public-mobile-link" },
        href: "/eventlist-app-debug.apk",
        download: "Eventlist-app-debug.apk",
    });
    /** @type {__VLS_StyleScopedClasses['public-mobile-link']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        'aria-hidden': "true",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "profile-menu" },
    });
    /** @type {__VLS_StyleScopedClasses['profile-menu']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.sessionLoading))
                    throw 0;
                if (!!(!__VLS_ctx.user))
                    throw 0;
                if (!(__VLS_ctx.user.role === 'user'))
                    throw 0;
                return (__VLS_ctx.profileMenuOpen = !__VLS_ctx.profileMenuOpen);
                // @ts-ignore
                [user, authMode, profileMenuOpen, profileMenuOpen,];
            } },
        ...{ class: "profile-trigger public-profile-trigger" },
        type: "button",
        'aria-expanded': (__VLS_ctx.profileMenuOpen),
        'aria-haspopup': "menu",
        'aria-label': "Open profile menu",
    });
    /** @type {__VLS_StyleScopedClasses['profile-trigger']} */ ;
    /** @type {__VLS_StyleScopedClasses['public-profile-trigger']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "avatar avatar-small" },
    });
    /** @type {__VLS_StyleScopedClasses['avatar']} */ ;
    /** @type {__VLS_StyleScopedClasses['avatar-small']} */ ;
    (__VLS_ctx.user.name?.slice(0, 1).toUpperCase());
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "account-name" },
    });
    /** @type {__VLS_StyleScopedClasses['account-name']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.user.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "profile-chevron" },
        'aria-hidden': "true",
    });
    /** @type {__VLS_StyleScopedClasses['profile-chevron']} */ ;
    if (__VLS_ctx.profileMenuOpen) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "profile-dropdown" },
            role: "menu",
        });
        /** @type {__VLS_StyleScopedClasses['profile-dropdown']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "profile-dropdown-user" },
        });
        /** @type {__VLS_StyleScopedClasses['profile-dropdown-user']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        (__VLS_ctx.user.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
        (__VLS_ctx.user.email);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.signOut) },
            type: "button",
            role: "menuitem",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            'aria-hidden': "true",
        });
    }
    if (__VLS_ctx.publicHeroSlides.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
            ...{ onMouseenter: (__VLS_ctx.pausePublicHero) },
            ...{ onMouseleave: (__VLS_ctx.resumePublicHero) },
            ...{ onFocusin: (__VLS_ctx.pausePublicHero) },
            ...{ onFocusout: (__VLS_ctx.resumePublicHero) },
            ...{ onKeydown: (...[$event]) => {
                    if (!!(__VLS_ctx.sessionLoading))
                        throw 0;
                    if (!!(!__VLS_ctx.user))
                        throw 0;
                    if (!(__VLS_ctx.user.role === 'user'))
                        throw 0;
                    if (!(__VLS_ctx.publicHeroSlides.length))
                        throw 0;
                    return (__VLS_ctx.changePublicSlide(-1));
                    // @ts-ignore
                    [user, user, user, user, profileMenuOpen, profileMenuOpen, signOut, publicHeroSlides, pausePublicHero, pausePublicHero, resumePublicHero, resumePublicHero, changePublicSlide,];
                } },
            ...{ onKeydown: (...[$event]) => {
                    if (!!(__VLS_ctx.sessionLoading))
                        throw 0;
                    if (!!(!__VLS_ctx.user))
                        throw 0;
                    if (!(__VLS_ctx.user.role === 'user'))
                        throw 0;
                    if (!(__VLS_ctx.publicHeroSlides.length))
                        throw 0;
                    return (__VLS_ctx.changePublicSlide(1));
                    // @ts-ignore
                    [changePublicSlide,];
                } },
            ...{ class: "public-hero" },
            'aria-label': "Eventlist highlights",
            tabindex: "0",
        });
        /** @type {__VLS_StyleScopedClasses['public-hero']} */ ;
        let __VLS_0;
        /** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
        Transition;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
            name: "hero-slide",
            mode: "out-in",
        }));
        const __VLS_2 = __VLS_1({
            name: "hero-slide",
            mode: "out-in",
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        const { default: __VLS_5 } = __VLS_3.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (__VLS_ctx.activePublicSlide),
            ...{ class: "public-hero-slide" },
            'aria-live': "polite",
        });
        /** @type {__VLS_StyleScopedClasses['public-hero-slide']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "public-hero-copy" },
        });
        /** @type {__VLS_StyleScopedClasses['public-hero-copy']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "story-kicker" },
        });
        /** @type {__VLS_StyleScopedClasses['story-kicker']} */ ;
        (__VLS_ctx.publicHeroSlides[__VLS_ctx.activePublicSlide].kicker);
        __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
        for (const [line, index] of __VLS_vFor((__VLS_ctx.publicHeroSlides[__VLS_ctx.activePublicSlide].title))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.template)({
                key: (line),
            });
            (line);
            if (index < __VLS_ctx.publicHeroSlides[__VLS_ctx.activePublicSlide].title.length - 1) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.br)({});
            }
            // @ts-ignore
            [publicHeroSlides, publicHeroSlides, publicHeroSlides, activePublicSlide, activePublicSlide, activePublicSlide, activePublicSlide,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
        (__VLS_ctx.publicHeroSlides[__VLS_ctx.activePublicSlide].description);
        __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
            ...{ class: "public-hero-button" },
            href: "#discover",
        });
        /** @type {__VLS_StyleScopedClasses['public-hero-button']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            'aria-hidden': "true",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "public-hero-art" },
            'aria-hidden': "true",
        });
        /** @type {__VLS_StyleScopedClasses['public-hero-art']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (__VLS_ctx.publicHeroSlides[__VLS_ctx.activePublicSlide].symbol);
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        for (const [line, index] of __VLS_vFor((__VLS_ctx.publicHeroSlides[__VLS_ctx.activePublicSlide].art))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.template)({
                key: (line),
            });
            (line);
            if (index < __VLS_ctx.publicHeroSlides[__VLS_ctx.activePublicSlide].art.length - 1) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.br)({});
            }
            // @ts-ignore
            [publicHeroSlides, publicHeroSlides, publicHeroSlides, publicHeroSlides, activePublicSlide, activePublicSlide, activePublicSlide, activePublicSlide,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({});
        // @ts-ignore
        [];
        var __VLS_3;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "public-hero-controls" },
        });
        /** @type {__VLS_StyleScopedClasses['public-hero-controls']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "public-hero-dots" },
            'aria-label': "Choose a highlight",
        });
        /** @type {__VLS_StyleScopedClasses['public-hero-dots']} */ ;
        for (const [slide, index] of __VLS_vFor((__VLS_ctx.publicHeroSlides))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.sessionLoading))
                            throw 0;
                        if (!!(!__VLS_ctx.user))
                            throw 0;
                        if (!(__VLS_ctx.user.role === 'user'))
                            throw 0;
                        if (!(__VLS_ctx.publicHeroSlides.length))
                            throw 0;
                        return (__VLS_ctx.activePublicSlide = index);
                        // @ts-ignore
                        [publicHeroSlides, activePublicSlide,];
                    } },
                key: (slide.kicker),
                type: "button",
                ...{ class: ({ active: __VLS_ctx.activePublicSlide === index }) },
                'aria-label': (`Show highlight ${index + 1}`),
                'aria-current': (__VLS_ctx.activePublicSlide === index ? 'true' : undefined),
            });
            /** @type {__VLS_StyleScopedClasses['active']} */ ;
            // @ts-ignore
            [activePublicSlide, activePublicSlide,];
        }
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "public-quick-stats" },
        'aria-label': "Eventlist community statistics",
    });
    /** @type {__VLS_StyleScopedClasses['public-quick-stats']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.publicUpcomingEvents.length);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.publicVenueCount);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.publicEvents.length);
    __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
        href: "#discover",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({
        'aria-hidden': "true",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "public-app-banner" },
        'aria-label': "Download the Eventlist Android app",
    });
    /** @type {__VLS_StyleScopedClasses['public-app-banner']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "public-app-copy" },
    });
    /** @type {__VLS_StyleScopedClasses['public-app-copy']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "public-app-kicker" },
    });
    /** @type {__VLS_StyleScopedClasses['public-app-kicker']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
        href: "/eventlist-app-debug.apk",
        download: "Eventlist-app-debug.apk",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "android-download-icon" },
        'aria-hidden': "true",
    });
    /** @type {__VLS_StyleScopedClasses['android-download-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({
        'aria-hidden': "true",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({
        ...{ class: "public-app-note" },
    });
    /** @type {__VLS_StyleScopedClasses['public-app-note']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "public-phone-mockup" },
        'aria-hidden': "true",
    });
    /** @type {__VLS_StyleScopedClasses['public-phone-mockup']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "public-phone-speaker" },
    });
    /** @type {__VLS_StyleScopedClasses['public-phone-speaker']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "public-phone-screen" },
    });
    /** @type {__VLS_StyleScopedClasses['public-phone-screen']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "phone-status" },
    });
    /** @type {__VLS_StyleScopedClasses['phone-status']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "phone-brand" },
    });
    /** @type {__VLS_StyleScopedClasses['phone-brand']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "phone-card-art" },
    });
    /** @type {__VLS_StyleScopedClasses['phone-card-art']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.br)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.br)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "phone-feature" },
    });
    /** @type {__VLS_StyleScopedClasses['phone-feature']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        id: "upcoming",
        ...{ class: "public-featured-section" },
    });
    /** @type {__VLS_StyleScopedClasses['public-featured-section']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "public-featured-heading" },
    });
    /** @type {__VLS_StyleScopedClasses['public-featured-heading']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "eyebrow" },
    });
    /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.sessionLoading))
                    throw 0;
                if (!!(!__VLS_ctx.user))
                    throw 0;
                if (!(__VLS_ctx.user.role === 'user'))
                    throw 0;
                return (__VLS_ctx.publicEventFilter = 'upcoming');
                // @ts-ignore
                [publicUpcomingEvents, publicVenueCount, publicEvents, publicEventFilter,];
            } },
        href: "#discover",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        'aria-hidden': "true",
    });
    if (__VLS_ctx.featuredPublicEvents.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "public-featured-grid" },
        });
        /** @type {__VLS_StyleScopedClasses['public-featured-grid']} */ ;
        for (const [event] of __VLS_vFor((__VLS_ctx.featuredPublicEvents))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.sessionLoading))
                            throw 0;
                        if (!!(!__VLS_ctx.user))
                            throw 0;
                        if (!(__VLS_ctx.user.role === 'user'))
                            throw 0;
                        if (!(__VLS_ctx.featuredPublicEvents.length))
                            throw 0;
                        return (__VLS_ctx.openEventDetails(event, $event.currentTarget));
                        // @ts-ignore
                        [featuredPublicEvents, featuredPublicEvents, openEventDetails,];
                    } },
                ...{ onKeydown: (...[$event]) => {
                        if (!!(__VLS_ctx.sessionLoading))
                            throw 0;
                        if (!!(!__VLS_ctx.user))
                            throw 0;
                        if (!(__VLS_ctx.user.role === 'user'))
                            throw 0;
                        if (!(__VLS_ctx.featuredPublicEvents.length))
                            throw 0;
                        return (__VLS_ctx.openEventDetails(event, $event.currentTarget));
                        // @ts-ignore
                        [openEventDetails,];
                    } },
                key: (`featured-${event.id}`),
                ...{ class: "public-featured-card" },
                role: "button",
                tabindex: "0",
            });
            /** @type {__VLS_StyleScopedClasses['public-featured-card']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "public-featured-date" },
            });
            /** @type {__VLS_StyleScopedClasses['public-featured-date']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
            (__VLS_ctx.formatDate(event.event_date, { day: 'numeric' }));
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            (__VLS_ctx.formatDate(event.event_date, { month: 'short' }));
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            (event.location);
            __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
            (event.title);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
            (__VLS_ctx.formatTime(event.event_time));
            (event.organizer || 'Community organizer');
            // @ts-ignore
            [formatDate, formatDate, formatTime,];
        }
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "public-featured-empty" },
        });
        /** @type {__VLS_StyleScopedClasses['public-featured-empty']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        id: "discover",
        ...{ class: "public-events-section" },
    });
    /** @type {__VLS_StyleScopedClasses['public-events-section']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "public-section-heading" },
    });
    /** @type {__VLS_StyleScopedClasses['public-section-heading']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "eyebrow" },
    });
    /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "public-event-summary" },
        'aria-label': "Event totals",
    });
    /** @type {__VLS_StyleScopedClasses['public-event-summary']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.publicEvents.length);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.publicUpcomingEvents.length);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.publicPastEvents.length);
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "public-search" },
    });
    /** @type {__VLS_StyleScopedClasses['public-search']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        'aria-hidden': "true",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "search",
        placeholder: "Search events or places",
        'aria-label': "Search public events",
    });
    (__VLS_ctx.publicSearch);
    if (__VLS_ctx.authSuccess) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "auth-success" },
            role: "status",
        });
        /** @type {__VLS_StyleScopedClasses['auth-success']} */ ;
        (__VLS_ctx.authSuccess);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "public-event-filters" },
        role: "group",
        'aria-label': "Filter events by date",
    });
    /** @type {__VLS_StyleScopedClasses['public-event-filters']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.sessionLoading))
                    throw 0;
                if (!!(!__VLS_ctx.user))
                    throw 0;
                if (!(__VLS_ctx.user.role === 'user'))
                    throw 0;
                return (__VLS_ctx.publicEventFilter = 'all');
                // @ts-ignore
                [publicUpcomingEvents, authSuccess, authSuccess, publicEvents, publicEventFilter, publicPastEvents, publicSearch,];
            } },
        type: "button",
        ...{ class: ({ selected: __VLS_ctx.publicEventFilter === 'all' }) },
    });
    /** @type {__VLS_StyleScopedClasses['selected']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.publicEvents.length);
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.sessionLoading))
                    throw 0;
                if (!!(!__VLS_ctx.user))
                    throw 0;
                if (!(__VLS_ctx.user.role === 'user'))
                    throw 0;
                return (__VLS_ctx.publicEventFilter = 'upcoming');
                // @ts-ignore
                [publicEvents, publicEventFilter, publicEventFilter,];
            } },
        type: "button",
        ...{ class: ({ selected: __VLS_ctx.publicEventFilter === 'upcoming' }) },
    });
    /** @type {__VLS_StyleScopedClasses['selected']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.publicUpcomingEvents.length);
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.sessionLoading))
                    throw 0;
                if (!!(!__VLS_ctx.user))
                    throw 0;
                if (!(__VLS_ctx.user.role === 'user'))
                    throw 0;
                return (__VLS_ctx.publicEventFilter = 'past');
                // @ts-ignore
                [publicUpcomingEvents, publicEventFilter, publicEventFilter,];
            } },
        type: "button",
        ...{ class: ({ selected: __VLS_ctx.publicEventFilter === 'past' }) },
    });
    /** @type {__VLS_StyleScopedClasses['selected']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.publicPastEvents.length);
    if (__VLS_ctx.publicError) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "public-empty" },
            role: "alert",
        });
        /** @type {__VLS_StyleScopedClasses['public-empty']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
        (__VLS_ctx.publicError);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.loadPublicEvents) },
            type: "button",
        });
    }
    else if (__VLS_ctx.publicLoading) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "public-empty" },
            role: "status",
        });
        /** @type {__VLS_StyleScopedClasses['public-empty']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "loading-mark" },
        });
        /** @type {__VLS_StyleScopedClasses['loading-mark']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    }
    else if (!__VLS_ctx.visiblePublicEvents.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "public-empty" },
        });
        /** @type {__VLS_StyleScopedClasses['public-empty']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            'aria-hidden': "true",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
        (__VLS_ctx.publicSearch ? 'No events match that search' : 'New events are on the way');
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
        (__VLS_ctx.publicSearch ? 'Try another event name, organizer, or location.' : 'Check back soon to see what the community is planning.');
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "public-event-grid" },
        });
        /** @type {__VLS_StyleScopedClasses['public-event-grid']} */ ;
        for (const [event] of __VLS_vFor((__VLS_ctx.visiblePublicEvents))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.sessionLoading))
                            throw 0;
                        if (!!(!__VLS_ctx.user))
                            throw 0;
                        if (!(__VLS_ctx.user.role === 'user'))
                            throw 0;
                        if (!!(__VLS_ctx.publicError))
                            throw 0;
                        if (!!(__VLS_ctx.publicLoading))
                            throw 0;
                        if (!!(!__VLS_ctx.visiblePublicEvents.length))
                            throw 0;
                        return (__VLS_ctx.openEventDetails(event, $event.currentTarget));
                        // @ts-ignore
                        [publicLoading, publicError, publicError, publicEventFilter, openEventDetails, publicPastEvents, publicSearch, publicSearch, loadPublicEvents, visiblePublicEvents, visiblePublicEvents,];
                    } },
                ...{ onKeydown: (...[$event]) => {
                        if (!!(__VLS_ctx.sessionLoading))
                            throw 0;
                        if (!!(!__VLS_ctx.user))
                            throw 0;
                        if (!(__VLS_ctx.user.role === 'user'))
                            throw 0;
                        if (!!(__VLS_ctx.publicError))
                            throw 0;
                        if (!!(__VLS_ctx.publicLoading))
                            throw 0;
                        if (!!(!__VLS_ctx.visiblePublicEvents.length))
                            throw 0;
                        return (__VLS_ctx.openEventDetails(event, $event.currentTarget));
                        // @ts-ignore
                        [openEventDetails,];
                    } },
                ...{ onKeydown: (...[$event]) => {
                        if (!!(__VLS_ctx.sessionLoading))
                            throw 0;
                        if (!!(!__VLS_ctx.user))
                            throw 0;
                        if (!(__VLS_ctx.user.role === 'user'))
                            throw 0;
                        if (!!(__VLS_ctx.publicError))
                            throw 0;
                        if (!!(__VLS_ctx.publicLoading))
                            throw 0;
                        if (!!(!__VLS_ctx.visiblePublicEvents.length))
                            throw 0;
                        return (__VLS_ctx.openEventDetails(event, $event.currentTarget));
                        // @ts-ignore
                        [openEventDetails,];
                    } },
                key: (`public-${event.id}`),
                ...{ class: "public-event-card" },
                role: "button",
                tabindex: "0",
                'aria-label': (`View details for ${event.title}`),
            });
            /** @type {__VLS_StyleScopedClasses['public-event-card']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "public-event-art" },
                ...{ class: ({ 'has-cover': event.image_url }) },
            });
            /** @type {__VLS_StyleScopedClasses['public-event-art']} */ ;
            /** @type {__VLS_StyleScopedClasses['has-cover']} */ ;
            if (event.image_url) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.img)({
                    ...{ class: "public-event-cover" },
                    src: (event.image_url),
                    alt: (`${event.title} event cover`),
                });
                /** @type {__VLS_StyleScopedClasses['public-event-cover']} */ ;
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "public-event-date" },
            });
            /** @type {__VLS_StyleScopedClasses['public-event-date']} */ ;
            (__VLS_ctx.formatDate(event.event_date, { month: 'short', day: 'numeric' }));
            if (!event.image_url) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    'aria-hidden': "true",
                });
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "public-event-body" },
            });
            /** @type {__VLS_StyleScopedClasses['public-event-body']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "public-event-tag" },
                ...{ class: ({ 'new-announcement': __VLS_ctx.isNewAnnouncement(event) }) },
            });
            /** @type {__VLS_StyleScopedClasses['public-event-tag']} */ ;
            /** @type {__VLS_StyleScopedClasses['new-announcement']} */ ;
            (__VLS_ctx.isNewAnnouncement(event) ? 'New announcement' : __VLS_ctx.eventStatus(event));
            __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
            (event.title);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
            (event.description || 'A new opportunity to connect with your community.');
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "public-event-meta" },
            });
            /** @type {__VLS_StyleScopedClasses['public-event-meta']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            (event.location);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            (__VLS_ctx.formatTime(event.event_time));
            if (event.organizer) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
                (event.organizer);
            }
            if (event.capacity !== null && event.capacity !== undefined) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
                (Number(event.capacity).toLocaleString());
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "public-event-details-link" },
            });
            /** @type {__VLS_StyleScopedClasses['public-event-details-link']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                'aria-hidden': "true",
            });
            // @ts-ignore
            [formatDate, formatTime, isNewAnnouncement, isNewAnnouncement, eventStatus,];
        }
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        id: "venues",
        ...{ class: "public-venues-section" },
    });
    /** @type {__VLS_StyleScopedClasses['public-venues-section']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "eyebrow" },
    });
    /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    if (__VLS_ctx.publicLocations.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "public-location-list" },
            'aria-label': "Event locations",
        });
        /** @type {__VLS_StyleScopedClasses['public-location-list']} */ ;
        for (const [location] of __VLS_vFor((__VLS_ctx.publicLocations))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.sessionLoading))
                            throw 0;
                        if (!!(!__VLS_ctx.user))
                            throw 0;
                        if (!(__VLS_ctx.user.role === 'user'))
                            throw 0;
                        if (!(__VLS_ctx.publicLocations.length))
                            throw 0;
                        return (__VLS_ctx.searchPublicByLocation(location));
                        // @ts-ignore
                        [publicLocations, publicLocations, searchPublicByLocation,];
                    } },
                key: (location),
                type: "button",
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
            (location);
            __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({
                'aria-hidden': "true",
            });
            // @ts-ignore
            [];
        }
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "public-featured-empty" },
        });
        /** @type {__VLS_StyleScopedClasses['public-featured-empty']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.footer, __VLS_intrinsics.footer)({
        id: "about",
        ...{ class: "public-footer" },
    });
    /** @type {__VLS_StyleScopedClasses['public-footer']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "public-footer-brand" },
    });
    /** @type {__VLS_StyleScopedClasses['public-footer-brand']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "brand-mark" },
    });
    /** @type {__VLS_StyleScopedClasses['brand-mark']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.nav, __VLS_intrinsics.nav)({
        'aria-label': "Footer navigation",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
        href: "#discover",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
        href: "#upcoming",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
        href: "#venues",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
        href: "/eventlist-app-debug.apk",
        download: "Eventlist-app-debug.apk",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.nav, __VLS_intrinsics.nav)({
        'aria-label': "Account navigation",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.sessionLoading))
                    throw 0;
                if (!!(!__VLS_ctx.user))
                    throw 0;
                if (!(__VLS_ctx.user.role === 'user'))
                    throw 0;
                return (__VLS_ctx.profileMenuOpen = true);
                // @ts-ignore
                [profileMenuOpen,];
            } },
        type: "button",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.signOut) },
        type: "button",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "public-footer-bottom" },
    });
    /** @type {__VLS_StyleScopedClasses['public-footer-bottom']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.currentYear);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
}
else if (__VLS_ctx.user.role === 'owner' || __VLS_ctx.user.role === 'admin') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "app-shell" },
    });
    /** @type {__VLS_StyleScopedClasses['app-shell']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.aside, __VLS_intrinsics.aside)({
        ...{ class: "sidebar" },
    });
    /** @type {__VLS_StyleScopedClasses['sidebar']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
        ...{ class: "sidebar-brand" },
        href: "#",
        'aria-label': "Eventlist home",
    });
    /** @type {__VLS_StyleScopedClasses['sidebar-brand']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "brand-mark" },
    });
    /** @type {__VLS_StyleScopedClasses['brand-mark']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.nav, __VLS_intrinsics.nav)({
        ...{ class: "side-nav" },
        'aria-label': "Main navigation",
    });
    /** @type {__VLS_StyleScopedClasses['side-nav']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.sessionLoading))
                    throw 0;
                if (!!(!__VLS_ctx.user))
                    throw 0;
                if (!!(__VLS_ctx.user.role === 'user'))
                    throw 0;
                if (!(__VLS_ctx.user.role === 'owner' || __VLS_ctx.user.role === 'admin'))
                    throw 0;
                return (__VLS_ctx.navigateToPage('dashboard'));
                // @ts-ignore
                [user, user, signOut, currentYear, navigateToPage,];
            } },
        ...{ class: "nav-link" },
        ...{ class: ({ active: __VLS_ctx.currentPage === 'dashboard' }) },
        type: "button",
        'aria-current': (__VLS_ctx.currentPage === 'dashboard' ? 'page' : undefined),
    });
    /** @type {__VLS_StyleScopedClasses['nav-link']} */ ;
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.sessionLoading))
                    throw 0;
                if (!!(!__VLS_ctx.user))
                    throw 0;
                if (!!(__VLS_ctx.user.role === 'user'))
                    throw 0;
                if (!(__VLS_ctx.user.role === 'owner' || __VLS_ctx.user.role === 'admin'))
                    throw 0;
                return (__VLS_ctx.navigateToPage('events'));
                // @ts-ignore
                [navigateToPage, currentPage, currentPage,];
            } },
        ...{ class: "nav-link" },
        ...{ class: ({ active: __VLS_ctx.currentPage === 'events' }) },
        type: "button",
        'aria-current': (__VLS_ctx.currentPage === 'events' ? 'page' : undefined),
    });
    /** @type {__VLS_StyleScopedClasses['nav-link']} */ ;
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.openCreateForm) },
        ...{ class: "nav-link" },
        ...{ class: ({ active: __VLS_ctx.currentPage === 'create-event' }) },
        type: "button",
        'aria-current': (__VLS_ctx.currentPage === 'create-event' ? 'page' : undefined),
    });
    /** @type {__VLS_StyleScopedClasses['nav-link']} */ ;
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.sessionLoading))
                    throw 0;
                if (!!(!__VLS_ctx.user))
                    throw 0;
                if (!!(__VLS_ctx.user.role === 'user'))
                    throw 0;
                if (!(__VLS_ctx.user.role === 'owner' || __VLS_ctx.user.role === 'admin'))
                    throw 0;
                return (__VLS_ctx.navigateToPage('calendar'));
                // @ts-ignore
                [navigateToPage, currentPage, currentPage, currentPage, currentPage, openCreateForm,];
            } },
        ...{ class: "nav-link" },
        ...{ class: ({ active: __VLS_ctx.currentPage === 'calendar' }) },
        type: "button",
        'aria-current': (__VLS_ctx.currentPage === 'calendar' ? 'page' : undefined),
    });
    /** @type {__VLS_StyleScopedClasses['nav-link']} */ ;
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.sessionLoading))
                    throw 0;
                if (!!(!__VLS_ctx.user))
                    throw 0;
                if (!!(__VLS_ctx.user.role === 'user'))
                    throw 0;
                if (!(__VLS_ctx.user.role === 'owner' || __VLS_ctx.user.role === 'admin'))
                    throw 0;
                return (__VLS_ctx.navigateToPage('analytics'));
                // @ts-ignore
                [navigateToPage, currentPage, currentPage,];
            } },
        ...{ class: "nav-link" },
        ...{ class: ({ active: __VLS_ctx.currentPage === 'analytics' }) },
        type: "button",
        'aria-current': (__VLS_ctx.currentPage === 'analytics' ? 'page' : undefined),
    });
    /** @type {__VLS_StyleScopedClasses['nav-link']} */ ;
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.sessionLoading))
                    throw 0;
                if (!!(!__VLS_ctx.user))
                    throw 0;
                if (!!(__VLS_ctx.user.role === 'user'))
                    throw 0;
                if (!(__VLS_ctx.user.role === 'owner' || __VLS_ctx.user.role === 'admin'))
                    throw 0;
                return (__VLS_ctx.navigateToPage('homepage'));
                // @ts-ignore
                [navigateToPage, currentPage, currentPage,];
            } },
        ...{ class: "nav-link" },
        ...{ class: ({ active: __VLS_ctx.currentPage === 'homepage' }) },
        type: "button",
        'aria-current': (__VLS_ctx.currentPage === 'homepage' ? 'page' : undefined),
    });
    /** @type {__VLS_StyleScopedClasses['nav-link']} */ ;
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    if (__VLS_ctx.user.role === 'owner') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.sessionLoading))
                        throw 0;
                    if (!!(!__VLS_ctx.user))
                        throw 0;
                    if (!!(__VLS_ctx.user.role === 'user'))
                        throw 0;
                    if (!(__VLS_ctx.user.role === 'owner' || __VLS_ctx.user.role === 'admin'))
                        throw 0;
                    if (!(__VLS_ctx.user.role === 'owner'))
                        throw 0;
                    return (__VLS_ctx.navigateToPage('administrators'));
                    // @ts-ignore
                    [user, navigateToPage, currentPage, currentPage,];
                } },
            ...{ class: "nav-link" },
            ...{ class: ({ active: __VLS_ctx.currentPage === 'administrators' }) },
            type: "button",
            'aria-current': (__VLS_ctx.currentPage === 'administrators' ? 'page' : undefined),
        });
        /** @type {__VLS_StyleScopedClasses['nav-link']} */ ;
        /** @type {__VLS_StyleScopedClasses['active']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "sidebar-note" },
    });
    /** @type {__VLS_StyleScopedClasses['sidebar-note']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "sidebar-note-icon" },
    });
    /** @type {__VLS_StyleScopedClasses['sidebar-note-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.br)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "note-leaf" },
        'aria-hidden': "true",
    });
    /** @type {__VLS_StyleScopedClasses['note-leaf']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "sidebar-footer" },
    });
    /** @type {__VLS_StyleScopedClasses['sidebar-footer']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "avatar" },
    });
    /** @type {__VLS_StyleScopedClasses['avatar']} */ ;
    (__VLS_ctx.user.name?.slice(0, 1).toUpperCase());
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "sidebar-user" },
    });
    /** @type {__VLS_StyleScopedClasses['sidebar-user']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.user.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "workspace" },
    });
    /** @type {__VLS_StyleScopedClasses['workspace']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({
        ...{ class: "topbar" },
    });
    /** @type {__VLS_StyleScopedClasses['topbar']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "top-search" },
    });
    /** @type {__VLS_StyleScopedClasses['top-search']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        'aria-hidden': "true",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "search",
        placeholder: "Search events, locations, or organizers…",
        'aria-label': "Search events, locations, or organizers",
    });
    (__VLS_ctx.search);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "topbar-account" },
    });
    /** @type {__VLS_StyleScopedClasses['topbar-account']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "workspace-status" },
    });
    /** @type {__VLS_StyleScopedClasses['workspace-status']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "profile-menu" },
    });
    /** @type {__VLS_StyleScopedClasses['profile-menu']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.sessionLoading))
                    throw 0;
                if (!!(!__VLS_ctx.user))
                    throw 0;
                if (!!(__VLS_ctx.user.role === 'user'))
                    throw 0;
                if (!(__VLS_ctx.user.role === 'owner' || __VLS_ctx.user.role === 'admin'))
                    throw 0;
                return (__VLS_ctx.profileMenuOpen = !__VLS_ctx.profileMenuOpen);
                // @ts-ignore
                [user, user, profileMenuOpen, profileMenuOpen, currentPage, currentPage, search,];
            } },
        ...{ class: "profile-trigger" },
        type: "button",
        'aria-expanded': (__VLS_ctx.profileMenuOpen),
        'aria-haspopup': "menu",
        'aria-label': "Open profile menu",
    });
    /** @type {__VLS_StyleScopedClasses['profile-trigger']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "avatar avatar-small" },
    });
    /** @type {__VLS_StyleScopedClasses['avatar']} */ ;
    /** @type {__VLS_StyleScopedClasses['avatar-small']} */ ;
    (__VLS_ctx.user.name?.slice(0, 1).toUpperCase());
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "account-name" },
    });
    /** @type {__VLS_StyleScopedClasses['account-name']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.user.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    (__VLS_ctx.user.role === 'owner' ? 'Portal owner' : 'Administrator');
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "profile-chevron" },
        'aria-hidden': "true",
    });
    /** @type {__VLS_StyleScopedClasses['profile-chevron']} */ ;
    if (__VLS_ctx.profileMenuOpen) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "profile-dropdown" },
            role: "menu",
        });
        /** @type {__VLS_StyleScopedClasses['profile-dropdown']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "profile-dropdown-user" },
        });
        /** @type {__VLS_StyleScopedClasses['profile-dropdown-user']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        (__VLS_ctx.user.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
        (__VLS_ctx.user.email);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.signOut) },
            type: "button",
            role: "menuitem",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            'aria-hidden': "true",
        });
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.main, __VLS_intrinsics.main)({
        id: "home",
        ...{ class: "dashboard" },
        ...{ class: ({ 'single-page': __VLS_ctx.currentPage !== 'dashboard' }) },
    });
    /** @type {__VLS_StyleScopedClasses['dashboard']} */ ;
    /** @type {__VLS_StyleScopedClasses['single-page']} */ ;
    if (__VLS_ctx.currentPage === 'dashboard') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
            ...{ class: "hero-banner" },
        });
        /** @type {__VLS_StyleScopedClasses['hero-banner']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "hero-content" },
        });
        /** @type {__VLS_StyleScopedClasses['hero-content']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "hero-kicker" },
        });
        /** @type {__VLS_StyleScopedClasses['hero-kicker']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
        (__VLS_ctx.user.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            'aria-hidden': "true",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "hero-metrics" },
        });
        /** @type {__VLS_StyleScopedClasses['hero-metrics']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "metric-icon" },
        });
        /** @type {__VLS_StyleScopedClasses['metric-icon']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        (__VLS_ctx.events.length);
        __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "metric-icon" },
        });
        /** @type {__VLS_StyleScopedClasses['metric-icon']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        (__VLS_ctx.upcomingCount);
        __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "metric-icon" },
        });
        /** @type {__VLS_StyleScopedClasses['metric-icon']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        (__VLS_ctx.totalCapacity.toLocaleString());
        __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.openCreateForm) },
            ...{ class: "hero-create" },
            type: "button",
        });
        /** @type {__VLS_StyleScopedClasses['hero-create']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "hero-glow" },
            'aria-hidden': "true",
        });
        /** @type {__VLS_StyleScopedClasses['hero-glow']} */ ;
    }
    if (__VLS_ctx.currentPage !== 'dashboard') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({
            ...{ class: "admin-page-heading" },
        });
        /** @type {__VLS_StyleScopedClasses['admin-page-heading']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "eyebrow" },
        });
        /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
        (__VLS_ctx.portalPageContent.title);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
        (__VLS_ctx.portalPageContent.description);
        if (__VLS_ctx.currentPage === 'events') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.openCreateForm) },
                ...{ class: "admin-page-primary" },
                type: "button",
            });
            /** @type {__VLS_StyleScopedClasses['admin-page-primary']} */ ;
        }
        else if (__VLS_ctx.currentPage === 'administrators' && __VLS_ctx.user.role === 'owner') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.openAdminModal) },
                ...{ class: "admin-page-primary" },
                type: "button",
            });
            /** @type {__VLS_StyleScopedClasses['admin-page-primary']} */ ;
        }
        else if (__VLS_ctx.currentPage === 'homepage') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.openCreateSlideForm) },
                ...{ class: "admin-page-primary" },
                type: "button",
            });
            /** @type {__VLS_StyleScopedClasses['admin-page-primary']} */ ;
        }
    }
    if (__VLS_ctx.error) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "error-message full-width" },
            role: "alert",
        });
        /** @type {__VLS_StyleScopedClasses['error-message']} */ ;
        /** @type {__VLS_StyleScopedClasses['full-width']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
        (__VLS_ctx.error);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.loadEvents) },
            type: "button",
        });
    }
    if (__VLS_ctx.currentPage === 'create-event' && __VLS_ctx.showForm) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
            ...{ class: "form-panel full-width" },
        });
        /** @type {__VLS_StyleScopedClasses['form-panel']} */ ;
        /** @type {__VLS_StyleScopedClasses['full-width']} */ ;
        const __VLS_6 = EventForm;
        // @ts-ignore
        const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
            ...{ 'onSubmit': {} },
            ...{ 'onCancel': {} },
            initialEvent: (__VLS_ctx.editingEvent),
            loading: (__VLS_ctx.saving),
        }));
        const __VLS_8 = __VLS_7({
            ...{ 'onSubmit': {} },
            ...{ 'onCancel': {} },
            initialEvent: (__VLS_ctx.editingEvent),
            loading: (__VLS_ctx.saving),
        }, ...__VLS_functionalComponentArgsRest(__VLS_7));
        let __VLS_11;
        const __VLS_12 = {
            /** @type {typeof __VLS_11.submit} */
            onSubmit: (__VLS_ctx.saveEvent),
        };
        const __VLS_13 = {
            /** @type {typeof __VLS_11.cancel} */
            onCancel: (__VLS_ctx.cancelEventForm),
        };
        var __VLS_9;
        var __VLS_10;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.cancelEventForm) },
            ...{ class: "form-back-link" },
            type: "button",
        });
        /** @type {__VLS_StyleScopedClasses['form-back-link']} */ ;
    }
    if (__VLS_ctx.currentPage === 'dashboard' || __VLS_ctx.currentPage === 'analytics') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
            id: "overview",
            ...{ class: "panel analytics-panel" },
            ...{ class: ({ 'analytics-page-panel': __VLS_ctx.currentPage === 'analytics' }) },
        });
        /** @type {__VLS_StyleScopedClasses['panel']} */ ;
        /** @type {__VLS_StyleScopedClasses['analytics-panel']} */ ;
        /** @type {__VLS_StyleScopedClasses['analytics-page-panel']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "panel-heading" },
        });
        /** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "live-badge" },
        });
        /** @type {__VLS_StyleScopedClasses['live-badge']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "chart-bars" },
            role: "img",
            'aria-label': "Daily events created during the last seven days",
        });
        /** @type {__VLS_StyleScopedClasses['chart-bars']} */ ;
        for (const [day] of __VLS_vFor((__VLS_ctx.eventWeek))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (day.date),
                ...{ class: "chart-column" },
            });
            /** @type {__VLS_StyleScopedClasses['chart-column']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
            (day.count);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "chart-track" },
            });
            /** @type {__VLS_StyleScopedClasses['chart-track']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ style: ({ height: `${Math.max(4, day.count / __VLS_ctx.maxWeekCount * 100)}%` }) },
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
            (day.label);
            // @ts-ignore
            [user, user, user, user, user, user, user, profileMenuOpen, profileMenuOpen, signOut, currentPage, currentPage, currentPage, currentPage, currentPage, currentPage, currentPage, currentPage, currentPage, currentPage, openCreateForm, openCreateForm, events, upcomingCount, totalCapacity, portalPageContent, portalPageContent, openAdminModal, openCreateSlideForm, error, error, loadEvents, showForm, editingEvent, saving, saveEvent, cancelEventForm, cancelEventForm, eventWeek, maxWeekCount,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "analytics-summary" },
        });
        /** @type {__VLS_StyleScopedClasses['analytics-summary']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "analytics-icon" },
        });
        /** @type {__VLS_StyleScopedClasses['analytics-icon']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        (__VLS_ctx.upcomingCount);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "analytics-icon" },
        });
        /** @type {__VLS_StyleScopedClasses['analytics-icon']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        (__VLS_ctx.totalCapacity.toLocaleString());
    }
    if (__VLS_ctx.currentPage === 'dashboard') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
            ...{ class: "panel upcoming-panel" },
        });
        /** @type {__VLS_StyleScopedClasses['panel']} */ ;
        /** @type {__VLS_StyleScopedClasses['upcoming-panel']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "panel-heading" },
        });
        /** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.sessionLoading))
                        throw 0;
                    if (!!(!__VLS_ctx.user))
                        throw 0;
                    if (!!(__VLS_ctx.user.role === 'user'))
                        throw 0;
                    if (!(__VLS_ctx.user.role === 'owner' || __VLS_ctx.user.role === 'admin'))
                        throw 0;
                    if (!(__VLS_ctx.currentPage === 'dashboard'))
                        throw 0;
                    __VLS_ctx.dateFilter = 'upcoming';
                    __VLS_ctx.selectedCalendarDate = '';
                    __VLS_ctx.navigateToPage('events');
                    // @ts-ignore
                    [navigateToPage, currentPage, upcomingCount, totalCapacity, dateFilter, selectedCalendarDate,];
                } },
            type: "button",
            ...{ class: "text-action" },
        });
        /** @type {__VLS_StyleScopedClasses['text-action']} */ ;
        if (!__VLS_ctx.upcomingEvents.length) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "widget-empty" },
            });
            /** @type {__VLS_StyleScopedClasses['widget-empty']} */ ;
        }
        for (const [event] of __VLS_vFor((__VLS_ctx.upcomingEvents.slice(0, 5)))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.sessionLoading))
                            throw 0;
                        if (!!(!__VLS_ctx.user))
                            throw 0;
                        if (!!(__VLS_ctx.user.role === 'user'))
                            throw 0;
                        if (!(__VLS_ctx.user.role === 'owner' || __VLS_ctx.user.role === 'admin'))
                            throw 0;
                        if (!(__VLS_ctx.currentPage === 'dashboard'))
                            throw 0;
                        return (__VLS_ctx.openEventDetails(event, $event.currentTarget));
                        // @ts-ignore
                        [openEventDetails, upcomingEvents, upcomingEvents,];
                    } },
                key: (`upcoming-${event.id}`),
                type: "button",
                ...{ class: "upcoming-row" },
            });
            /** @type {__VLS_StyleScopedClasses['upcoming-row']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "upcoming-date" },
            });
            /** @type {__VLS_StyleScopedClasses['upcoming-date']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
            (new Date(`${String(event.event_date).slice(0, 10)}T00:00:00`).getDate());
            __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
            (__VLS_ctx.formatDate(event.event_date, { month: 'short' }));
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "upcoming-info" },
            });
            /** @type {__VLS_StyleScopedClasses['upcoming-info']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
            (event.title);
            __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
            (__VLS_ctx.formatTime(event.event_time));
            (event.location);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "event-status" },
                ...{ class: (__VLS_ctx.eventStatus(event).toLowerCase()) },
            });
            /** @type {__VLS_StyleScopedClasses['event-status']} */ ;
            (__VLS_ctx.eventStatus(event));
            // @ts-ignore
            [formatDate, formatTime, eventStatus, eventStatus,];
        }
    }
    if (__VLS_ctx.currentPage === 'dashboard') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.aside, __VLS_intrinsics.aside)({
            ...{ class: "dashboard-rail" },
        });
        /** @type {__VLS_StyleScopedClasses['dashboard-rail']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
            ...{ class: "panel quick-actions" },
        });
        /** @type {__VLS_StyleScopedClasses['panel']} */ ;
        /** @type {__VLS_StyleScopedClasses['quick-actions']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "panel-heading" },
        });
        /** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "quick-list" },
        });
        /** @type {__VLS_StyleScopedClasses['quick-list']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.openCreateForm) },
            type: "button",
            ...{ class: "quick-primary" },
        });
        /** @type {__VLS_StyleScopedClasses['quick-primary']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.sessionLoading))
                        throw 0;
                    if (!!(!__VLS_ctx.user))
                        throw 0;
                    if (!!(__VLS_ctx.user.role === 'user'))
                        throw 0;
                    if (!(__VLS_ctx.user.role === 'owner' || __VLS_ctx.user.role === 'admin'))
                        throw 0;
                    if (!(__VLS_ctx.currentPage === 'dashboard'))
                        throw 0;
                    return (__VLS_ctx.navigateToPage('events'));
                    // @ts-ignore
                    [navigateToPage, currentPage, openCreateForm,];
                } },
            type: "button",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.sessionLoading))
                        throw 0;
                    if (!!(!__VLS_ctx.user))
                        throw 0;
                    if (!!(__VLS_ctx.user.role === 'user'))
                        throw 0;
                    if (!(__VLS_ctx.user.role === 'owner' || __VLS_ctx.user.role === 'admin'))
                        throw 0;
                    if (!(__VLS_ctx.currentPage === 'dashboard'))
                        throw 0;
                    return (__VLS_ctx.navigateToPage('calendar'));
                    // @ts-ignore
                    [navigateToPage,];
                } },
            type: "button",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.sessionLoading))
                        throw 0;
                    if (!!(!__VLS_ctx.user))
                        throw 0;
                    if (!!(__VLS_ctx.user.role === 'user'))
                        throw 0;
                    if (!(__VLS_ctx.user.role === 'owner' || __VLS_ctx.user.role === 'admin'))
                        throw 0;
                    if (!(__VLS_ctx.currentPage === 'dashboard'))
                        throw 0;
                    return (__VLS_ctx.navigateToPage('homepage'));
                    // @ts-ignore
                    [navigateToPage,];
                } },
            type: "button",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        if (__VLS_ctx.user.role === 'owner') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.sessionLoading))
                            throw 0;
                        if (!!(!__VLS_ctx.user))
                            throw 0;
                        if (!!(__VLS_ctx.user.role === 'user'))
                            throw 0;
                        if (!(__VLS_ctx.user.role === 'owner' || __VLS_ctx.user.role === 'admin'))
                            throw 0;
                        if (!(__VLS_ctx.currentPage === 'dashboard'))
                            throw 0;
                        if (!(__VLS_ctx.user.role === 'owner'))
                            throw 0;
                        return (__VLS_ctx.navigateToPage('administrators'));
                        // @ts-ignore
                        [user, navigateToPage,];
                    } },
                type: "button",
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.exportEvents) },
            type: "button",
            disabled: (!__VLS_ctx.events.length),
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
            id: "calendar",
            ...{ class: "calendar-panel panel" },
        });
        /** @type {__VLS_StyleScopedClasses['calendar-panel']} */ ;
        /** @type {__VLS_StyleScopedClasses['panel']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "calendar-heading" },
        });
        /** @type {__VLS_StyleScopedClasses['calendar-heading']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
        (__VLS_ctx.calendarTitle);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.sessionLoading))
                        throw 0;
                    if (!!(!__VLS_ctx.user))
                        throw 0;
                    if (!!(__VLS_ctx.user.role === 'user'))
                        throw 0;
                    if (!(__VLS_ctx.user.role === 'owner' || __VLS_ctx.user.role === 'admin'))
                        throw 0;
                    if (!(__VLS_ctx.currentPage === 'dashboard'))
                        throw 0;
                    return (__VLS_ctx.changeMonth(-1));
                    // @ts-ignore
                    [events, exportEvents, calendarTitle, changeMonth,];
                } },
            type: "button",
            'aria-label': "Previous month",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.sessionLoading))
                        throw 0;
                    if (!!(!__VLS_ctx.user))
                        throw 0;
                    if (!!(__VLS_ctx.user.role === 'user'))
                        throw 0;
                    if (!(__VLS_ctx.user.role === 'owner' || __VLS_ctx.user.role === 'admin'))
                        throw 0;
                    if (!(__VLS_ctx.currentPage === 'dashboard'))
                        throw 0;
                    return (__VLS_ctx.changeMonth(1));
                    // @ts-ignore
                    [changeMonth,];
                } },
            type: "button",
            'aria-label': "Next month",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "calendar-grid calendar-weekdays" },
        });
        /** @type {__VLS_StyleScopedClasses['calendar-grid']} */ ;
        /** @type {__VLS_StyleScopedClasses['calendar-weekdays']} */ ;
        for (const [day, index] of __VLS_vFor((['S', 'M', 'T', 'W', 'T', 'F', 'S']))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                key: (index),
            });
            (day);
            // @ts-ignore
            [];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "calendar-grid calendar-dates" },
        });
        /** @type {__VLS_StyleScopedClasses['calendar-grid']} */ ;
        /** @type {__VLS_StyleScopedClasses['calendar-dates']} */ ;
        for (const [day, index] of __VLS_vFor((__VLS_ctx.calendarDays))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                key: (day?.isoDate || `empty-${index}`),
            });
            if (day) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(__VLS_ctx.sessionLoading))
                                throw 0;
                            if (!!(!__VLS_ctx.user))
                                throw 0;
                            if (!!(__VLS_ctx.user.role === 'user'))
                                throw 0;
                            if (!(__VLS_ctx.user.role === 'owner' || __VLS_ctx.user.role === 'admin'))
                                throw 0;
                            if (!(__VLS_ctx.currentPage === 'dashboard'))
                                throw 0;
                            if (!(day))
                                throw 0;
                            return (__VLS_ctx.selectCalendarDate(day.isoDate));
                            // @ts-ignore
                            [calendarDays, selectCalendarDate,];
                        } },
                    type: "button",
                    ...{ class: ({ today: day.isToday, 'has-event': day.hasEvent, picked: __VLS_ctx.selectedCalendarDate === day.isoDate }) },
                    'aria-label': (`${__VLS_ctx.formatDate(day.isoDate)}, ${day.hasEvent ? 'has events' : 'no events'}`),
                });
                /** @type {__VLS_StyleScopedClasses['today']} */ ;
                /** @type {__VLS_StyleScopedClasses['picked']} */ ;
                /** @type {__VLS_StyleScopedClasses['has-event']} */ ;
                (day.day);
                if (day.hasEvent) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({});
                }
            }
            // @ts-ignore
            [formatDate, selectedCalendarDate,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "calendar-hint" },
        });
        /** @type {__VLS_StyleScopedClasses['calendar-hint']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        if (__VLS_ctx.selectedCalendarDate) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.sessionLoading))
                            throw 0;
                        if (!!(!__VLS_ctx.user))
                            throw 0;
                        if (!!(__VLS_ctx.user.role === 'user'))
                            throw 0;
                        if (!(__VLS_ctx.user.role === 'owner' || __VLS_ctx.user.role === 'admin'))
                            throw 0;
                        if (!(__VLS_ctx.currentPage === 'dashboard'))
                            throw 0;
                        if (!(__VLS_ctx.selectedCalendarDate))
                            throw 0;
                        return (__VLS_ctx.selectedCalendarDate = '');
                        // @ts-ignore
                        [selectedCalendarDate, selectedCalendarDate,];
                    } },
                type: "button",
            });
        }
        if (__VLS_ctx.user.role === 'owner') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
                id: "admins",
                ...{ class: "panel admin-panel" },
            });
            /** @type {__VLS_StyleScopedClasses['panel']} */ ;
            /** @type {__VLS_StyleScopedClasses['admin-panel']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "panel-heading" },
            });
            /** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "admin-count" },
            });
            /** @type {__VLS_StyleScopedClasses['admin-count']} */ ;
            (__VLS_ctx.admins.length);
            if (__VLS_ctx.adminLoading) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "widget-empty" },
                });
                /** @type {__VLS_StyleScopedClasses['widget-empty']} */ ;
            }
            else if (__VLS_ctx.adminError) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "widget-error" },
                });
                /** @type {__VLS_StyleScopedClasses['widget-error']} */ ;
                (__VLS_ctx.adminError);
            }
            else if (!__VLS_ctx.admins.length) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "widget-empty" },
                });
                /** @type {__VLS_StyleScopedClasses['widget-empty']} */ ;
            }
            for (const [admin] of __VLS_vFor((__VLS_ctx.admins.slice(0, 3)))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    key: (admin.id),
                    ...{ class: "admin-row" },
                });
                /** @type {__VLS_StyleScopedClasses['admin-row']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "avatar admin-avatar" },
                });
                /** @type {__VLS_StyleScopedClasses['avatar']} */ ;
                /** @type {__VLS_StyleScopedClasses['admin-avatar']} */ ;
                (admin.name.slice(0, 1).toUpperCase());
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
                __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
                (admin.name);
                __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
                (admin.role === 'owner' ? 'Portal owner' : admin.email);
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: ({ inactive: !admin.is_active }) },
                });
                /** @type {__VLS_StyleScopedClasses['inactive']} */ ;
                // @ts-ignore
                [user, admins, admins, admins, adminLoading, adminError, adminError,];
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.openAdminModal) },
                ...{ class: "manage-admins-btn" },
                type: "button",
            });
            /** @type {__VLS_StyleScopedClasses['manage-admins-btn']} */ ;
        }
    }
    if (__VLS_ctx.currentPage === 'calendar') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
            ...{ class: "calendar-page panel" },
        });
        /** @type {__VLS_StyleScopedClasses['calendar-page']} */ ;
        /** @type {__VLS_StyleScopedClasses['panel']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "calendar-page-heading" },
        });
        /** @type {__VLS_StyleScopedClasses['calendar-page-heading']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "eyebrow" },
        });
        /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
        (__VLS_ctx.upcomingCount);
        (__VLS_ctx.upcomingCount === 1 ? '' : 's');
        __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
        (__VLS_ctx.calendarTitle);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "calendar-month-actions" },
        });
        /** @type {__VLS_StyleScopedClasses['calendar-month-actions']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.sessionLoading))
                        throw 0;
                    if (!!(!__VLS_ctx.user))
                        throw 0;
                    if (!!(__VLS_ctx.user.role === 'user'))
                        throw 0;
                    if (!(__VLS_ctx.user.role === 'owner' || __VLS_ctx.user.role === 'admin'))
                        throw 0;
                    if (!(__VLS_ctx.currentPage === 'calendar'))
                        throw 0;
                    return (__VLS_ctx.changeMonth(-1));
                    // @ts-ignore
                    [currentPage, upcomingCount, upcomingCount, openAdminModal, calendarTitle, changeMonth,];
                } },
            type: "button",
            'aria-label': "Previous month",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.sessionLoading))
                        throw 0;
                    if (!!(!__VLS_ctx.user))
                        throw 0;
                    if (!!(__VLS_ctx.user.role === 'user'))
                        throw 0;
                    if (!(__VLS_ctx.user.role === 'owner' || __VLS_ctx.user.role === 'admin'))
                        throw 0;
                    if (!(__VLS_ctx.currentPage === 'calendar'))
                        throw 0;
                    return (__VLS_ctx.changeMonth(1));
                    // @ts-ignore
                    [changeMonth,];
                } },
            type: "button",
            'aria-label': "Next month",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "calendar-page-grid" },
        });
        /** @type {__VLS_StyleScopedClasses['calendar-page-grid']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "calendar-page-weekdays" },
        });
        /** @type {__VLS_StyleScopedClasses['calendar-page-weekdays']} */ ;
        for (const [day, index] of __VLS_vFor((['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                key: (`${day}-${index}`),
            });
            (day);
            // @ts-ignore
            [];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "calendar-page-days" },
        });
        /** @type {__VLS_StyleScopedClasses['calendar-page-days']} */ ;
        for (const [day, index] of __VLS_vFor((__VLS_ctx.calendarDays))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (day?.isoDate || `calendar-empty-${index}`),
                ...{ class: "calendar-page-day" },
                ...{ class: ({ 'is-empty': !day, 'is-today': day?.isToday, 'is-selected': day && __VLS_ctx.selectedCalendarDate === day.isoDate }) },
            });
            /** @type {__VLS_StyleScopedClasses['calendar-page-day']} */ ;
            /** @type {__VLS_StyleScopedClasses['is-empty']} */ ;
            /** @type {__VLS_StyleScopedClasses['is-today']} */ ;
            /** @type {__VLS_StyleScopedClasses['is-selected']} */ ;
            if (day) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(__VLS_ctx.sessionLoading))
                                throw 0;
                            if (!!(!__VLS_ctx.user))
                                throw 0;
                            if (!!(__VLS_ctx.user.role === 'user'))
                                throw 0;
                            if (!(__VLS_ctx.user.role === 'owner' || __VLS_ctx.user.role === 'admin'))
                                throw 0;
                            if (!(__VLS_ctx.currentPage === 'calendar'))
                                throw 0;
                            if (!(day))
                                throw 0;
                            return (__VLS_ctx.selectCalendarDate(day.isoDate));
                            // @ts-ignore
                            [selectedCalendarDate, calendarDays, selectCalendarDate,];
                        } },
                    type: "button",
                    ...{ class: "calendar-page-day-number" },
                    'aria-label': (`Show events for ${__VLS_ctx.formatDate(day.isoDate)}`),
                });
                /** @type {__VLS_StyleScopedClasses['calendar-page-day-number']} */ ;
                (day.day);
                for (const [event] of __VLS_vFor(((__VLS_ctx.calendarEventsByDate.get(day.isoDate) || []).slice(0, 2)))) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!!(__VLS_ctx.sessionLoading))
                                    throw 0;
                                if (!!(!__VLS_ctx.user))
                                    throw 0;
                                if (!!(__VLS_ctx.user.role === 'user'))
                                    throw 0;
                                if (!(__VLS_ctx.user.role === 'owner' || __VLS_ctx.user.role === 'admin'))
                                    throw 0;
                                if (!(__VLS_ctx.currentPage === 'calendar'))
                                    throw 0;
                                if (!(day))
                                    throw 0;
                                return (__VLS_ctx.openEventDetails(event, $event.currentTarget));
                                // @ts-ignore
                                [formatDate, openEventDetails, calendarEventsByDate,];
                            } },
                        key: (`calendar-event-${event.id}`),
                        type: "button",
                        ...{ class: "calendar-event-chip" },
                    });
                    /** @type {__VLS_StyleScopedClasses['calendar-event-chip']} */ ;
                    (__VLS_ctx.formatTime(event.event_time));
                    (event.title);
                    // @ts-ignore
                    [formatTime,];
                }
                if ((__VLS_ctx.calendarEventsByDate.get(day.isoDate) || []).length > 2) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "calendar-more-events" },
                    });
                    /** @type {__VLS_StyleScopedClasses['calendar-more-events']} */ ;
                    ((__VLS_ctx.calendarEventsByDate.get(day.isoDate) || []).length - 2);
                }
            }
            // @ts-ignore
            [calendarEventsByDate, calendarEventsByDate,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "calendar-page-hint" },
        });
        /** @type {__VLS_StyleScopedClasses['calendar-page-hint']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    }
    if (__VLS_ctx.currentPage === 'administrators' && __VLS_ctx.user.role === 'owner') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
            ...{ class: "admin-page-panel panel" },
        });
        /** @type {__VLS_StyleScopedClasses['admin-page-panel']} */ ;
        /** @type {__VLS_StyleScopedClasses['panel']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "admin-page-panel-heading" },
        });
        /** @type {__VLS_StyleScopedClasses['admin-page-panel-heading']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "admin-count" },
        });
        /** @type {__VLS_StyleScopedClasses['admin-count']} */ ;
        (__VLS_ctx.admins.length);
        if (__VLS_ctx.adminLoading) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "widget-empty" },
            });
            /** @type {__VLS_StyleScopedClasses['widget-empty']} */ ;
        }
        else if (__VLS_ctx.adminError) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "widget-error" },
            });
            /** @type {__VLS_StyleScopedClasses['widget-error']} */ ;
            (__VLS_ctx.adminError);
        }
        else if (!__VLS_ctx.admins.length) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "admin-page-empty" },
            });
            /** @type {__VLS_StyleScopedClasses['admin-page-empty']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                'aria-hidden': "true",
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "admin-page-list" },
            });
            /** @type {__VLS_StyleScopedClasses['admin-page-list']} */ ;
            for (const [admin] of __VLS_vFor((__VLS_ctx.admins))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
                    key: (`admin-page-${admin.id}`),
                    ...{ class: "admin-page-row" },
                });
                /** @type {__VLS_StyleScopedClasses['admin-page-row']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "avatar admin-page-avatar" },
                });
                /** @type {__VLS_StyleScopedClasses['avatar']} */ ;
                /** @type {__VLS_StyleScopedClasses['admin-page-avatar']} */ ;
                (admin.name.slice(0, 1).toUpperCase());
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "admin-page-details" },
                });
                /** @type {__VLS_StyleScopedClasses['admin-page-details']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
                (admin.name);
                __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
                (admin.email);
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "admin-page-role" },
                    ...{ class: (admin.role) },
                });
                /** @type {__VLS_StyleScopedClasses['admin-page-role']} */ ;
                (admin.role === 'owner' ? 'Owner' : 'Administrator');
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "admin-page-status" },
                    ...{ class: ({ inactive: !admin.is_active }) },
                });
                /** @type {__VLS_StyleScopedClasses['admin-page-status']} */ ;
                /** @type {__VLS_StyleScopedClasses['inactive']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({});
                (admin.is_active ? 'Active' : 'Inactive');
                if (admin.role === 'admin') {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!!(__VLS_ctx.sessionLoading))
                                    throw 0;
                                if (!!(!__VLS_ctx.user))
                                    throw 0;
                                if (!!(__VLS_ctx.user.role === 'user'))
                                    throw 0;
                                if (!(__VLS_ctx.user.role === 'owner' || __VLS_ctx.user.role === 'admin'))
                                    throw 0;
                                if (!(__VLS_ctx.currentPage === 'administrators' && __VLS_ctx.user.role === 'owner'))
                                    throw 0;
                                if (!!(__VLS_ctx.adminLoading))
                                    throw 0;
                                if (!!(__VLS_ctx.adminError))
                                    throw 0;
                                if (!!(!__VLS_ctx.admins.length))
                                    throw 0;
                                if (!(admin.role === 'admin'))
                                    throw 0;
                                return (__VLS_ctx.removeAdmin(admin));
                                // @ts-ignore
                                [user, currentPage, admins, admins, admins, adminLoading, adminError, adminError, removeAdmin,];
                            } },
                        type: "button",
                        ...{ class: "remove-admin-btn" },
                        'aria-label': (`Remove ${admin.name}`),
                    });
                    /** @type {__VLS_StyleScopedClasses['remove-admin-btn']} */ ;
                }
                // @ts-ignore
                [];
            }
        }
    }
    if (__VLS_ctx.currentPage === 'events') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
            id: "events",
            ...{ class: "events-section full-width" },
        });
        /** @type {__VLS_StyleScopedClasses['events-section']} */ ;
        /** @type {__VLS_StyleScopedClasses['full-width']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "section-heading" },
        });
        /** @type {__VLS_StyleScopedClasses['section-heading']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "section-title-row" },
        });
        /** @type {__VLS_StyleScopedClasses['section-title-row']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "section-icon" },
        });
        /** @type {__VLS_StyleScopedClasses['section-icon']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
        (__VLS_ctx.selectedCalendarDate ? `Events on ${__VLS_ctx.formatDate(__VLS_ctx.selectedCalendarDate)}` : `Showing ${__VLS_ctx.filteredEvents.length} of ${__VLS_ctx.events.length} events`);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "schedule-controls" },
        });
        /** @type {__VLS_StyleScopedClasses['schedule-controls']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
            ...{ class: "event-search" },
        });
        /** @type {__VLS_StyleScopedClasses['event-search']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "sr-only" },
        });
        /** @type {__VLS_StyleScopedClasses['sr-only']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            type: "search",
            placeholder: "Search events, locations, organizers…",
        });
        (__VLS_ctx.search);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "filter-pills" },
            'aria-label': "Filter events",
        });
        /** @type {__VLS_StyleScopedClasses['filter-pills']} */ ;
        for (const [filter] of __VLS_vFor((['all', 'upcoming', 'past']))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.sessionLoading))
                            throw 0;
                        if (!!(!__VLS_ctx.user))
                            throw 0;
                        if (!!(__VLS_ctx.user.role === 'user'))
                            throw 0;
                        if (!(__VLS_ctx.user.role === 'owner' || __VLS_ctx.user.role === 'admin'))
                            throw 0;
                        if (!(__VLS_ctx.currentPage === 'events'))
                            throw 0;
                        __VLS_ctx.dateFilter = filter;
                        __VLS_ctx.selectedCalendarDate = '';
                        // @ts-ignore
                        [formatDate, currentPage, search, events, dateFilter, selectedCalendarDate, selectedCalendarDate, selectedCalendarDate, filteredEvents,];
                    } },
                key: (filter),
                type: "button",
                ...{ class: ({ selected: __VLS_ctx.dateFilter === filter && !__VLS_ctx.selectedCalendarDate }) },
            });
            /** @type {__VLS_StyleScopedClasses['selected']} */ ;
            (filter === 'all' ? 'All' : filter === 'upcoming' ? 'Upcoming' : 'Past');
            // @ts-ignore
            [dateFilter, selectedCalendarDate,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
            ...{ class: "sort-select" },
        });
        /** @type {__VLS_StyleScopedClasses['sort-select']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "sr-only" },
        });
        /** @type {__VLS_StyleScopedClasses['sr-only']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
            value: (__VLS_ctx.sortOrder),
            'aria-label': "Sort events",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            value: "soonest",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            value: "latest",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.exportEvents) },
            ...{ class: "export-btn" },
            type: "button",
            disabled: (!__VLS_ctx.filteredEvents.length),
        });
        /** @type {__VLS_StyleScopedClasses['export-btn']} */ ;
        if (__VLS_ctx.loading) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "empty-state loading-state" },
                role: "status",
            });
            /** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
            /** @type {__VLS_StyleScopedClasses['loading-state']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "loading-mark" },
                'aria-hidden': "true",
            });
            /** @type {__VLS_StyleScopedClasses['loading-mark']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
        }
        else if (__VLS_ctx.filteredEvents.length === 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "empty-state" },
            });
            /** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "empty-calendar" },
            });
            /** @type {__VLS_StyleScopedClasses['empty-calendar']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
            (__VLS_ctx.search || __VLS_ctx.selectedCalendarDate ? 'No matching events' : 'Your event schedule is ready');
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
            (__VLS_ctx.search || __VLS_ctx.selectedCalendarDate ? 'Try adjusting your search or filters.' : 'Create your first event to start building your schedule.');
            if (!__VLS_ctx.search && !__VLS_ctx.selectedCalendarDate) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (__VLS_ctx.openCreateForm) },
                    ...{ class: "primary-btn" },
                    type: "button",
                });
                /** @type {__VLS_StyleScopedClasses['primary-btn']} */ ;
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(__VLS_ctx.sessionLoading))
                                throw 0;
                            if (!!(!__VLS_ctx.user))
                                throw 0;
                            if (!!(__VLS_ctx.user.role === 'user'))
                                throw 0;
                            if (!(__VLS_ctx.user.role === 'owner' || __VLS_ctx.user.role === 'admin'))
                                throw 0;
                            if (!(__VLS_ctx.currentPage === 'events'))
                                throw 0;
                            if (!!(__VLS_ctx.loading))
                                throw 0;
                            if (!(__VLS_ctx.filteredEvents.length === 0))
                                throw 0;
                            if (!!(!__VLS_ctx.search && !__VLS_ctx.selectedCalendarDate))
                                throw 0;
                            __VLS_ctx.search = '';
                            __VLS_ctx.selectedCalendarDate = '';
                            __VLS_ctx.dateFilter = 'all';
                            // @ts-ignore
                            [openCreateForm, search, search, search, search, dateFilter, selectedCalendarDate, selectedCalendarDate, selectedCalendarDate, selectedCalendarDate, exportEvents, filteredEvents, filteredEvents, sortOrder, loading,];
                        } },
                    ...{ class: "clear-filter-btn" },
                    type: "button",
                });
                /** @type {__VLS_StyleScopedClasses['clear-filter-btn']} */ ;
            }
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "event-list" },
            });
            /** @type {__VLS_StyleScopedClasses['event-list']} */ ;
            for (const [event] of __VLS_vFor((__VLS_ctx.filteredEvents))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
                    key: (event.id),
                    ...{ class: "event-card" },
                });
                /** @type {__VLS_StyleScopedClasses['event-card']} */ ;
                if (event.image_url) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "event-cover" },
                    });
                    /** @type {__VLS_StyleScopedClasses['event-cover']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.img)({
                        src: (event.image_url),
                        alt: (`${event.title} event cover`),
                    });
                }
                else {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "event-date-tile" },
                    });
                    /** @type {__VLS_StyleScopedClasses['event-date-tile']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
                    (__VLS_ctx.formatDate(event.event_date, { month: 'short' }).toUpperCase());
                    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
                    (new Date(`${String(event.event_date).slice(0, 10)}T00:00:00`).getDate());
                    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
                    (new Date(`${String(event.event_date).slice(0, 10)}T00:00:00`).getFullYear());
                }
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "event-main" },
                });
                /** @type {__VLS_StyleScopedClasses['event-main']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "event-status" },
                    ...{ class: (__VLS_ctx.eventStatus(event).toLowerCase()) },
                });
                /** @type {__VLS_StyleScopedClasses['event-status']} */ ;
                (__VLS_ctx.eventStatus(event));
                __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
                (event.title);
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "description" },
                });
                /** @type {__VLS_StyleScopedClasses['description']} */ ;
                (event.description || 'No description provided.');
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "event-meta" },
                });
                /** @type {__VLS_StyleScopedClasses['event-meta']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
                __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
                (__VLS_ctx.formatTime(event.event_time));
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
                __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
                (event.location);
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
                __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
                (event.organizer || __VLS_ctx.user.name);
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "event-capacity" },
                });
                /** @type {__VLS_StyleScopedClasses['event-capacity']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
                __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
                (Number(event.capacity).toLocaleString());
                __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "capacity-track" },
                });
                /** @type {__VLS_StyleScopedClasses['capacity-track']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ style: ({ width: event.capacity ? '34%' : '0%' }) },
                });
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "event-actions" },
                });
                /** @type {__VLS_StyleScopedClasses['event-actions']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(__VLS_ctx.sessionLoading))
                                throw 0;
                            if (!!(!__VLS_ctx.user))
                                throw 0;
                            if (!!(__VLS_ctx.user.role === 'user'))
                                throw 0;
                            if (!(__VLS_ctx.user.role === 'owner' || __VLS_ctx.user.role === 'admin'))
                                throw 0;
                            if (!(__VLS_ctx.currentPage === 'events'))
                                throw 0;
                            if (!!(__VLS_ctx.loading))
                                throw 0;
                            if (!!(__VLS_ctx.filteredEvents.length === 0))
                                throw 0;
                            return (__VLS_ctx.openEditForm(event));
                            // @ts-ignore
                            [user, formatDate, formatTime, eventStatus, eventStatus, filteredEvents, openEditForm,];
                        } },
                    ...{ class: "edit-btn" },
                    type: "button",
                });
                /** @type {__VLS_StyleScopedClasses['edit-btn']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(__VLS_ctx.sessionLoading))
                                throw 0;
                            if (!!(!__VLS_ctx.user))
                                throw 0;
                            if (!!(__VLS_ctx.user.role === 'user'))
                                throw 0;
                            if (!(__VLS_ctx.user.role === 'owner' || __VLS_ctx.user.role === 'admin'))
                                throw 0;
                            if (!(__VLS_ctx.currentPage === 'events'))
                                throw 0;
                            if (!!(__VLS_ctx.loading))
                                throw 0;
                            if (!!(__VLS_ctx.filteredEvents.length === 0))
                                throw 0;
                            return (__VLS_ctx.deleteEvent(event));
                            // @ts-ignore
                            [deleteEvent,];
                        } },
                    ...{ class: "delete-btn" },
                    type: "button",
                    'aria-label': (`Delete ${event.title}`),
                });
                /** @type {__VLS_StyleScopedClasses['delete-btn']} */ ;
                // @ts-ignore
                [];
            }
        }
    }
    if (__VLS_ctx.currentPage === 'homepage') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
            id: "hero-slides",
            ...{ class: "events-section full-width hero-management" },
        });
        /** @type {__VLS_StyleScopedClasses['events-section']} */ ;
        /** @type {__VLS_StyleScopedClasses['full-width']} */ ;
        /** @type {__VLS_StyleScopedClasses['hero-management']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "section-heading hero-management-heading" },
        });
        /** @type {__VLS_StyleScopedClasses['section-heading']} */ ;
        /** @type {__VLS_StyleScopedClasses['hero-management-heading']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "section-title-row" },
        });
        /** @type {__VLS_StyleScopedClasses['section-title-row']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "section-icon" },
        });
        /** @type {__VLS_StyleScopedClasses['section-icon']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.sessionLoading))
                        throw 0;
                    if (!!(!__VLS_ctx.user))
                        throw 0;
                    if (!!(__VLS_ctx.user.role === 'user'))
                        throw 0;
                    if (!(__VLS_ctx.user.role === 'owner' || __VLS_ctx.user.role === 'admin'))
                        throw 0;
                    if (!(__VLS_ctx.currentPage === 'homepage'))
                        throw 0;
                    return (__VLS_ctx.slideEditorOpen ? __VLS_ctx.closeSlideForm() : __VLS_ctx.openCreateSlideForm());
                    // @ts-ignore
                    [currentPage, openCreateSlideForm, slideEditorOpen, closeSlideForm,];
                } },
            ...{ class: "hero-slide-add" },
            type: "button",
        });
        /** @type {__VLS_StyleScopedClasses['hero-slide-add']} */ ;
        (__VLS_ctx.slideEditorOpen ? 'Cancel editing' : '＋ Add slide');
        if (__VLS_ctx.slideError) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "auth-error" },
                role: "alert",
            });
            /** @type {__VLS_StyleScopedClasses['auth-error']} */ ;
            (__VLS_ctx.slideError);
        }
        if (__VLS_ctx.slideSuccess) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "admin-success" },
                role: "status",
            });
            /** @type {__VLS_StyleScopedClasses['admin-success']} */ ;
            (__VLS_ctx.slideSuccess);
        }
        if (__VLS_ctx.slideEditorOpen) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)({
                ...{ onSubmit: (__VLS_ctx.saveHeroSlide) },
                ...{ class: "hero-slide-form" },
            });
            /** @type {__VLS_StyleScopedClasses['hero-slide-form']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "hero-slide-form-title" },
            });
            /** @type {__VLS_StyleScopedClasses['hero-slide-form-title']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "eyebrow" },
            });
            /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
            (__VLS_ctx.editingSlideId ? 'Edit homepage slide' : 'Create homepage slide');
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "hero-slide-active" },
            });
            /** @type {__VLS_StyleScopedClasses['hero-slide-active']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                type: "checkbox",
            });
            (__VLS_ctx.slideForm.is_active);
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "hero-slide-field" },
            });
            /** @type {__VLS_StyleScopedClasses['hero-slide-field']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                required: true,
                maxlength: "100",
                placeholder: "YOUR NEXT GOOD DAY STARTS HERE",
            });
            (__VLS_ctx.slideForm.eyebrow);
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "hero-slide-field" },
            });
            /** @type {__VLS_StyleScopedClasses['hero-slide-field']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                required: true,
                maxlength: "160",
                placeholder: "Find your people. | Make a memory.",
            });
            (__VLS_ctx.slideForm.title);
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "hero-slide-field" },
            });
            /** @type {__VLS_StyleScopedClasses['hero-slide-field']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.textarea, __VLS_intrinsics.textarea)({
                value: (__VLS_ctx.slideForm.description),
                required: true,
                maxlength: "500",
                rows: "2",
                placeholder: "A short message visitors will see on the homepage.",
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "hero-slide-form-row" },
            });
            /** @type {__VLS_StyleScopedClasses['hero-slide-form-row']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "hero-slide-field" },
            });
            /** @type {__VLS_StyleScopedClasses['hero-slide-field']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                required: true,
                maxlength: "80",
                placeholder: "Make | it a | moment.",
            });
            (__VLS_ctx.slideForm.art_text);
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "hero-slide-field hero-symbol-field" },
            });
            /** @type {__VLS_StyleScopedClasses['hero-slide-field']} */ ;
            /** @type {__VLS_StyleScopedClasses['hero-symbol-field']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                required: true,
                maxlength: "12",
                placeholder: "✦",
            });
            (__VLS_ctx.slideForm.symbol);
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "hero-slide-field hero-order-field" },
            });
            /** @type {__VLS_StyleScopedClasses['hero-slide-field']} */ ;
            /** @type {__VLS_StyleScopedClasses['hero-order-field']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                type: "number",
                min: "0",
                max: "999",
                required: true,
            });
            (__VLS_ctx.slideForm.sort_order);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "hero-slide-form-actions" },
            });
            /** @type {__VLS_StyleScopedClasses['hero-slide-form-actions']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.closeSlideForm) },
                type: "button",
                ...{ class: "cancel-btn" },
            });
            /** @type {__VLS_StyleScopedClasses['cancel-btn']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                type: "submit",
                ...{ class: "save-btn" },
                disabled: (__VLS_ctx.slideSaving),
            });
            /** @type {__VLS_StyleScopedClasses['save-btn']} */ ;
            (__VLS_ctx.slideSaving ? 'Saving…' : __VLS_ctx.editingSlideId ? 'Save changes' : 'Create slide');
        }
        if (__VLS_ctx.slideLoading) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "empty-state loading-state" },
                role: "status",
            });
            /** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
            /** @type {__VLS_StyleScopedClasses['loading-state']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "loading-mark" },
            });
            /** @type {__VLS_StyleScopedClasses['loading-mark']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
        }
        else if (!__VLS_ctx.managedHeroSlides.length) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "public-empty" },
            });
            /** @type {__VLS_StyleScopedClasses['public-empty']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                'aria-hidden': "true",
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "hero-slide-list" },
            });
            /** @type {__VLS_StyleScopedClasses['hero-slide-list']} */ ;
            for (const [slide] of __VLS_vFor((__VLS_ctx.managedHeroSlides))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
                    key: (`managed-slide-${slide.id}`),
                    ...{ class: "hero-slide-card" },
                });
                /** @type {__VLS_StyleScopedClasses['hero-slide-card']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "hero-slide-order" },
                });
                /** @type {__VLS_StyleScopedClasses['hero-slide-order']} */ ;
                (slide.sort_order + 1);
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "hero-slide-preview" },
                });
                /** @type {__VLS_StyleScopedClasses['hero-slide-preview']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
                (slide.eyebrow);
                __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
                (__VLS_ctx.slideLines(slide.title).join(' '));
                __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
                (slide.description);
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "hero-slide-card-status" },
                    ...{ class: ({ inactive: !slide.is_active }) },
                });
                /** @type {__VLS_StyleScopedClasses['hero-slide-card-status']} */ ;
                /** @type {__VLS_StyleScopedClasses['inactive']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({});
                (slide.is_active ? 'Public' : 'Hidden');
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "hero-slide-card-actions" },
                });
                /** @type {__VLS_StyleScopedClasses['hero-slide-card-actions']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(__VLS_ctx.sessionLoading))
                                throw 0;
                            if (!!(!__VLS_ctx.user))
                                throw 0;
                            if (!!(__VLS_ctx.user.role === 'user'))
                                throw 0;
                            if (!(__VLS_ctx.user.role === 'owner' || __VLS_ctx.user.role === 'admin'))
                                throw 0;
                            if (!(__VLS_ctx.currentPage === 'homepage'))
                                throw 0;
                            if (!!(__VLS_ctx.slideLoading))
                                throw 0;
                            if (!!(!__VLS_ctx.managedHeroSlides.length))
                                throw 0;
                            return (__VLS_ctx.editHeroSlide(slide));
                            // @ts-ignore
                            [slideEditorOpen, slideEditorOpen, closeSlideForm, slideError, slideError, slideSuccess, slideSuccess, saveHeroSlide, editingSlideId, editingSlideId, slideForm, slideForm, slideForm, slideForm, slideForm, slideForm, slideForm, slideSaving, slideSaving, slideLoading, managedHeroSlides, managedHeroSlides, slideLines, editHeroSlide,];
                        } },
                    type: "button",
                });
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(__VLS_ctx.sessionLoading))
                                throw 0;
                            if (!!(!__VLS_ctx.user))
                                throw 0;
                            if (!!(__VLS_ctx.user.role === 'user'))
                                throw 0;
                            if (!(__VLS_ctx.user.role === 'owner' || __VLS_ctx.user.role === 'admin'))
                                throw 0;
                            if (!(__VLS_ctx.currentPage === 'homepage'))
                                throw 0;
                            if (!!(__VLS_ctx.slideLoading))
                                throw 0;
                            if (!!(!__VLS_ctx.managedHeroSlides.length))
                                throw 0;
                            return (__VLS_ctx.toggleHeroSlide(slide));
                            // @ts-ignore
                            [toggleHeroSlide,];
                        } },
                    type: "button",
                });
                (slide.is_active ? 'Hide' : 'Publish');
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(__VLS_ctx.sessionLoading))
                                throw 0;
                            if (!!(!__VLS_ctx.user))
                                throw 0;
                            if (!!(__VLS_ctx.user.role === 'user'))
                                throw 0;
                            if (!(__VLS_ctx.user.role === 'owner' || __VLS_ctx.user.role === 'admin'))
                                throw 0;
                            if (!(__VLS_ctx.currentPage === 'homepage'))
                                throw 0;
                            if (!!(__VLS_ctx.slideLoading))
                                throw 0;
                            if (!!(!__VLS_ctx.managedHeroSlides.length))
                                throw 0;
                            return (__VLS_ctx.deleteHeroSlide(slide));
                            // @ts-ignore
                            [deleteHeroSlide,];
                        } },
                    type: "button",
                    ...{ class: "hero-delete-action" },
                    disabled: (__VLS_ctx.slideDeleteBusy === slide.id),
                });
                /** @type {__VLS_StyleScopedClasses['hero-delete-action']} */ ;
                (__VLS_ctx.slideDeleteBusy === slide.id ? 'Deleting…' : 'Delete');
                // @ts-ignore
                [slideDeleteBusy, slideDeleteBusy,];
            }
        }
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.footer, __VLS_intrinsics.footer)({
        ...{ class: "footer" },
    });
    /** @type {__VLS_StyleScopedClasses['footer']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "footer-right" },
    });
    /** @type {__VLS_StyleScopedClasses['footer-right']} */ ;
    (__VLS_ctx.user.email);
    (__VLS_ctx.user.role === 'owner' ? 'Owner' : 'Administrator');
    if (__VLS_ctx.adminModalOpen) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (__VLS_ctx.closeAdminModal) },
            ...{ class: "modal-backdrop" },
        });
        /** @type {__VLS_StyleScopedClasses['modal-backdrop']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
            ...{ class: "admin-modal" },
            role: "dialog",
            'aria-modal': "true",
            'aria-labelledby': "admin-modal-title",
        });
        /** @type {__VLS_StyleScopedClasses['admin-modal']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "admin-modal-heading" },
        });
        /** @type {__VLS_StyleScopedClasses['admin-modal-heading']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "eyebrow" },
        });
        /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
            id: "admin-modal-title",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.closeAdminModal) },
            type: "button",
            'aria-label': "Close dialog",
        });
        if (__VLS_ctx.adminSuccess) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "admin-success" },
                role: "status",
            });
            /** @type {__VLS_StyleScopedClasses['admin-success']} */ ;
            (__VLS_ctx.adminSuccess);
        }
        if (__VLS_ctx.adminError) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "auth-error" },
                role: "alert",
            });
            /** @type {__VLS_StyleScopedClasses['auth-error']} */ ;
            (__VLS_ctx.adminError);
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)({
            ...{ onSubmit: (__VLS_ctx.createAdmin) },
            ...{ class: "admin-form" },
        });
        /** @type {__VLS_StyleScopedClasses['admin-form']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
            ...{ class: "auth-field" },
        });
        /** @type {__VLS_StyleScopedClasses['auth-field']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            autocomplete: "name",
            maxlength: "255",
            required: true,
            placeholder: "Full name",
        });
        (__VLS_ctx.adminForm.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
            ...{ class: "auth-field" },
        });
        /** @type {__VLS_StyleScopedClasses['auth-field']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            type: "email",
            autocomplete: "email",
            maxlength: "255",
            required: true,
            placeholder: "admin@example.com",
        });
        (__VLS_ctx.adminForm.email);
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
            ...{ class: "auth-field" },
        });
        /** @type {__VLS_StyleScopedClasses['auth-field']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            type: "password",
            autocomplete: "new-password",
            minlength: "12",
            maxlength: "255",
            required: true,
            placeholder: "12+ chars, upper/lowercase, number and symbol",
        });
        (__VLS_ctx.adminForm.password);
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
            ...{ class: "auth-field" },
        });
        /** @type {__VLS_StyleScopedClasses['auth-field']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            type: "password",
            autocomplete: "new-password",
            minlength: "12",
            maxlength: "255",
            required: true,
            placeholder: "Enter the password again",
        });
        (__VLS_ctx.adminForm.password_confirmation);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "admin-form-note" },
        });
        /** @type {__VLS_StyleScopedClasses['admin-form-note']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ class: "auth-submit" },
            type: "submit",
            disabled: (__VLS_ctx.adminSaving),
        });
        /** @type {__VLS_StyleScopedClasses['auth-submit']} */ ;
        (__VLS_ctx.adminSaving ? 'Creating account…' : 'Create administrator');
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "admin-modal-list" },
        });
        /** @type {__VLS_StyleScopedClasses['admin-modal-list']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (__VLS_ctx.admins.length);
        for (const [admin] of __VLS_vFor((__VLS_ctx.admins))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (`modal-${admin.id}`),
                ...{ class: "admin-list-row" },
            });
            /** @type {__VLS_StyleScopedClasses['admin-list-row']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "avatar admin-avatar" },
            });
            /** @type {__VLS_StyleScopedClasses['avatar']} */ ;
            /** @type {__VLS_StyleScopedClasses['admin-avatar']} */ ;
            (admin.name.slice(0, 1).toUpperCase());
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "admin-list-details" },
            });
            /** @type {__VLS_StyleScopedClasses['admin-list-details']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
            (admin.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
            (admin.email);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "role-badge" },
                ...{ class: (admin.role) },
            });
            /** @type {__VLS_StyleScopedClasses['role-badge']} */ ;
            (admin.role === 'owner' ? 'Owner' : 'Admin');
            if (admin.role === 'admin') {
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(__VLS_ctx.sessionLoading))
                                throw 0;
                            if (!!(!__VLS_ctx.user))
                                throw 0;
                            if (!!(__VLS_ctx.user.role === 'user'))
                                throw 0;
                            if (!(__VLS_ctx.user.role === 'owner' || __VLS_ctx.user.role === 'admin'))
                                throw 0;
                            if (!(__VLS_ctx.adminModalOpen))
                                throw 0;
                            if (!(admin.role === 'admin'))
                                throw 0;
                            return (__VLS_ctx.removeAdmin(admin));
                            // @ts-ignore
                            [user, user, admins, admins, adminError, adminError, removeAdmin, adminModalOpen, closeAdminModal, closeAdminModal, adminSuccess, adminSuccess, createAdmin, adminForm, adminForm, adminForm, adminForm, adminSaving, adminSaving,];
                        } },
                    type: "button",
                    ...{ class: "remove-admin-btn" },
                    'aria-label': (`Remove ${admin.name}`),
                });
                /** @type {__VLS_StyleScopedClasses['remove-admin-btn']} */ ;
            }
            // @ts-ignore
            [];
        }
    }
}
if (__VLS_ctx.forgotPasswordOpen) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (__VLS_ctx.closeForgotPassword) },
        ...{ onKeydown: (__VLS_ctx.closeForgotPassword) },
        ...{ class: "password-modal-backdrop" },
        role: "presentation",
    });
    /** @type {__VLS_StyleScopedClasses['password-modal-backdrop']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "password-modal" },
        role: "dialog",
        'aria-modal': "true",
        'aria-labelledby': "forgot-password-title",
    });
    /** @type {__VLS_StyleScopedClasses['password-modal']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.closeForgotPassword) },
        ...{ class: "password-modal-close" },
        type: "button",
        'aria-label': "Close forgot password",
    });
    /** @type {__VLS_StyleScopedClasses['password-modal-close']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "eyebrow" },
    });
    /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
        id: "forgot-password-title",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "password-modal-subtitle" },
    });
    /** @type {__VLS_StyleScopedClasses['password-modal-subtitle']} */ ;
    if (__VLS_ctx.forgotPasswordError) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "auth-error" },
            role: "alert",
        });
        /** @type {__VLS_StyleScopedClasses['auth-error']} */ ;
        (__VLS_ctx.forgotPasswordError);
    }
    if (__VLS_ctx.forgotPasswordSuccess) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "auth-success" },
            role: "status",
        });
        /** @type {__VLS_StyleScopedClasses['auth-success']} */ ;
        (__VLS_ctx.forgotPasswordSuccess);
    }
    if (!__VLS_ctx.forgotPasswordSuccess) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)({
            ...{ onSubmit: (__VLS_ctx.submitForgotPassword) },
            ...{ class: "auth-form" },
        });
        /** @type {__VLS_StyleScopedClasses['auth-form']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
            ...{ class: "auth-field" },
        });
        /** @type {__VLS_StyleScopedClasses['auth-field']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            type: "email",
            autocomplete: "email",
            maxlength: "255",
            placeholder: "you@example.com",
            required: true,
        });
        (__VLS_ctx.forgotPasswordEmail);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ class: "auth-submit" },
            type: "submit",
            disabled: (__VLS_ctx.forgotPasswordLoading),
        });
        /** @type {__VLS_StyleScopedClasses['auth-submit']} */ ;
        (__VLS_ctx.forgotPasswordLoading ? 'Sending…' : 'Send reset link');
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            'aria-hidden': "true",
        });
    }
}
if (__VLS_ctx.resetPasswordOpen) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onKeydown: (__VLS_ctx.closeResetPassword) },
        ...{ class: "password-modal-backdrop" },
        role: "presentation",
    });
    /** @type {__VLS_StyleScopedClasses['password-modal-backdrop']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "password-modal" },
        role: "dialog",
        'aria-modal': "true",
        'aria-labelledby': "reset-password-title",
    });
    /** @type {__VLS_StyleScopedClasses['password-modal']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.closeResetPassword) },
        ...{ class: "password-modal-close" },
        type: "button",
        'aria-label': "Close reset password",
    });
    /** @type {__VLS_StyleScopedClasses['password-modal-close']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "eyebrow" },
    });
    /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
        id: "reset-password-title",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "password-modal-subtitle" },
    });
    /** @type {__VLS_StyleScopedClasses['password-modal-subtitle']} */ ;
    if (__VLS_ctx.resetPasswordError) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "auth-error" },
            role: "alert",
        });
        /** @type {__VLS_StyleScopedClasses['auth-error']} */ ;
        (__VLS_ctx.resetPasswordError);
    }
    if (__VLS_ctx.resetPasswordSuccess) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "auth-success" },
            role: "status",
        });
        /** @type {__VLS_StyleScopedClasses['auth-success']} */ ;
        (__VLS_ctx.resetPasswordSuccess);
    }
    if (!__VLS_ctx.resetPasswordSuccess) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)({
            ...{ onSubmit: (__VLS_ctx.submitResetPassword) },
            ...{ class: "auth-form" },
        });
        /** @type {__VLS_StyleScopedClasses['auth-form']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
            ...{ class: "auth-field" },
        });
        /** @type {__VLS_StyleScopedClasses['auth-field']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "password-input-wrap" },
        });
        /** @type {__VLS_StyleScopedClasses['password-input-wrap']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            type: (__VLS_ctx.resetPasswordVisible ? 'text' : 'password'),
            autocomplete: "new-password",
            minlength: "8",
            maxlength: "255",
            required: true,
        });
        (__VLS_ctx.resetPasswordForm.password);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.resetPasswordOpen))
                        throw 0;
                    if (!(!__VLS_ctx.resetPasswordSuccess))
                        throw 0;
                    return (__VLS_ctx.resetPasswordVisible = !__VLS_ctx.resetPasswordVisible);
                    // @ts-ignore
                    [forgotPasswordOpen, closeForgotPassword, closeForgotPassword, closeForgotPassword, forgotPasswordError, forgotPasswordError, forgotPasswordSuccess, forgotPasswordSuccess, forgotPasswordSuccess, submitForgotPassword, forgotPasswordEmail, forgotPasswordLoading, forgotPasswordLoading, resetPasswordOpen, closeResetPassword, closeResetPassword, resetPasswordError, resetPasswordError, resetPasswordSuccess, resetPasswordSuccess, resetPasswordSuccess, submitResetPassword, resetPasswordVisible, resetPasswordVisible, resetPasswordVisible, resetPasswordForm,];
                } },
            ...{ class: "password-toggle" },
            type: "button",
            'aria-label': (__VLS_ctx.resetPasswordVisible ? 'Hide new password' : 'Show new password'),
        });
        /** @type {__VLS_StyleScopedClasses['password-toggle']} */ ;
        if (__VLS_ctx.resetPasswordVisible) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
                viewBox: "0 0 24 24",
                'aria-hidden': "true",
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
                d: "M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.4 4.3A10.8 10.8 0 0112 4c5.5 0 9 4.8 9 8-.2 1.3-.9 2.7-1.9 3.8M6.2 6.2C4.2 7.6 3.1 9.6 3 12c0 3.2 3.5 8 9 8 1.2 0 2.4-.2 3.4-.7",
            });
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
                viewBox: "0 0 24 24",
                'aria-hidden': "true",
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
                d: "M3 12s3.5-8 9-8 9 8 9 8-3.5 8-9 8-9-8-9-8zM12 15a3 3 0 100-6 3 3 0 000 6z",
            });
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
            ...{ class: "auth-field" },
        });
        /** @type {__VLS_StyleScopedClasses['auth-field']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "password-input-wrap" },
        });
        /** @type {__VLS_StyleScopedClasses['password-input-wrap']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            type: (__VLS_ctx.resetConfirmationVisible ? 'text' : 'password'),
            autocomplete: "new-password",
            minlength: "8",
            maxlength: "255",
            required: true,
        });
        (__VLS_ctx.resetPasswordForm.password_confirmation);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.resetPasswordOpen))
                        throw 0;
                    if (!(!__VLS_ctx.resetPasswordSuccess))
                        throw 0;
                    return (__VLS_ctx.resetConfirmationVisible = !__VLS_ctx.resetConfirmationVisible);
                    // @ts-ignore
                    [resetPasswordVisible, resetPasswordVisible, resetPasswordForm, resetConfirmationVisible, resetConfirmationVisible, resetConfirmationVisible,];
                } },
            ...{ class: "password-toggle" },
            type: "button",
            'aria-label': (__VLS_ctx.resetConfirmationVisible ? 'Hide password confirmation' : 'Show password confirmation'),
        });
        /** @type {__VLS_StyleScopedClasses['password-toggle']} */ ;
        if (__VLS_ctx.resetConfirmationVisible) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
                viewBox: "0 0 24 24",
                'aria-hidden': "true",
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
                d: "M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.4 4.3A10.8 10.8 0 0112 4c5.5 0 9 4.8 9 8-.2 1.3-.9 2.7-1.9 3.8M6.2 6.2C4.2 7.6 3.1 9.6 3 12c0 3.2 3.5 8 9 8 1.2 0 2.4-.2 3.4-.7",
            });
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
                viewBox: "0 0 24 24",
                'aria-hidden': "true",
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
                d: "M3 12s3.5-8 9-8 9 8 9 8-3.5 8-9 8-9-8-9-8zM12 15a3 3 0 100-6 3 3 0 000 6z",
            });
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ class: "auth-submit" },
            type: "submit",
            disabled: (__VLS_ctx.resetPasswordLoading),
        });
        /** @type {__VLS_StyleScopedClasses['auth-submit']} */ ;
        (__VLS_ctx.resetPasswordLoading ? 'Updating…' : 'Reset password');
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            'aria-hidden': "true",
        });
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.closeResetPassword) },
            ...{ class: "auth-submit password-modal-done" },
            type: "button",
        });
        /** @type {__VLS_StyleScopedClasses['auth-submit']} */ ;
        /** @type {__VLS_StyleScopedClasses['password-modal-done']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            'aria-hidden': "true",
        });
    }
}
if (__VLS_ctx.selectedEventDetails) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (__VLS_ctx.closeEventDetails) },
        ...{ onKeydown: (__VLS_ctx.closeEventDetails) },
        ...{ class: "modal-backdrop event-details-backdrop" },
    });
    /** @type {__VLS_StyleScopedClasses['modal-backdrop']} */ ;
    /** @type {__VLS_StyleScopedClasses['event-details-backdrop']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "event-details-modal" },
        role: "dialog",
        'aria-modal': "true",
        'aria-labelledby': "event-details-title",
        tabindex: "-1",
    });
    /** @type {__VLS_StyleScopedClasses['event-details-modal']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "event-details-cover" },
        ...{ class: ({ 'has-cover': __VLS_ctx.selectedEventDetails.image_url }) },
    });
    /** @type {__VLS_StyleScopedClasses['event-details-cover']} */ ;
    /** @type {__VLS_StyleScopedClasses['has-cover']} */ ;
    if (__VLS_ctx.selectedEventDetails.image_url) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.img)({
            src: (__VLS_ctx.selectedEventDetails.image_url),
            alt: (`${__VLS_ctx.selectedEventDetails.title} event cover`),
        });
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "event-details-cover-mark" },
            'aria-hidden': "true",
        });
        /** @type {__VLS_StyleScopedClasses['event-details-cover-mark']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "event-details-date" },
    });
    /** @type {__VLS_StyleScopedClasses['event-details-date']} */ ;
    (__VLS_ctx.formatDate(__VLS_ctx.selectedEventDetails.event_date, { month: 'short', day: 'numeric' }));
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.closeEventDetails) },
        ref: "eventDetailsCloseButton",
        type: "button",
        ...{ class: "event-details-close" },
        'aria-label': "Close event details",
    });
    /** @type {__VLS_StyleScopedClasses['event-details-close']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "event-details-content" },
    });
    /** @type {__VLS_StyleScopedClasses['event-details-content']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "public-event-tag" },
        ...{ class: ({ 'new-announcement': __VLS_ctx.isNewAnnouncement(__VLS_ctx.selectedEventDetails) }) },
    });
    /** @type {__VLS_StyleScopedClasses['public-event-tag']} */ ;
    /** @type {__VLS_StyleScopedClasses['new-announcement']} */ ;
    (__VLS_ctx.isNewAnnouncement(__VLS_ctx.selectedEventDetails) ? 'New announcement' : __VLS_ctx.eventStatus(__VLS_ctx.selectedEventDetails));
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
        id: "event-details-title",
    });
    (__VLS_ctx.selectedEventDetails.title);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "event-details-description" },
    });
    /** @type {__VLS_StyleScopedClasses['event-details-description']} */ ;
    (__VLS_ctx.selectedEventDetails.description || 'A new opportunity to connect with your community.');
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "event-details-facts" },
    });
    /** @type {__VLS_StyleScopedClasses['event-details-facts']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "event-details-fact-icon" },
        'aria-hidden': "true",
    });
    /** @type {__VLS_StyleScopedClasses['event-details-fact-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.formatDate(__VLS_ctx.selectedEventDetails.event_date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "event-details-fact-icon" },
        'aria-hidden': "true",
    });
    /** @type {__VLS_StyleScopedClasses['event-details-fact-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.formatTime(__VLS_ctx.selectedEventDetails.event_time));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "event-details-fact-icon" },
        'aria-hidden': "true",
    });
    /** @type {__VLS_StyleScopedClasses['event-details-fact-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.selectedEventDetails.location);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "event-details-fact-icon" },
        'aria-hidden': "true",
    });
    /** @type {__VLS_StyleScopedClasses['event-details-fact-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.selectedEventDetails.organizer || 'To be announced');
    if (__VLS_ctx.selectedEventDetails.capacity !== null && __VLS_ctx.selectedEventDetails.capacity !== undefined) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "event-details-fact-icon" },
            'aria-hidden': "true",
        });
        /** @type {__VLS_StyleScopedClasses['event-details-fact-icon']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        (Number(__VLS_ctx.selectedEventDetails.capacity).toLocaleString());
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "event-details-map-section" },
        'aria-labelledby': "event-location-map-title",
    });
    /** @type {__VLS_StyleScopedClasses['event-details-map-section']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "event-details-map-heading" },
    });
    /** @type {__VLS_StyleScopedClasses['event-details-map-heading']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
        id: "event-location-map-title",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (__VLS_ctx.selectedEventDetails.location);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "event-map-provider" },
    });
    /** @type {__VLS_StyleScopedClasses['event-map-provider']} */ ;
    if (__VLS_ctx.hasPreciseEventLocation(__VLS_ctx.selectedEventDetails)) {
        const __VLS_14 = EventLocationMap;
        // @ts-ignore
        const __VLS_15 = __VLS_asFunctionalComponent1(__VLS_14, new __VLS_14({
            latitude: (Number(__VLS_ctx.selectedEventDetails.latitude)),
            longitude: (Number(__VLS_ctx.selectedEventDetails.longitude)),
        }));
        const __VLS_16 = __VLS_15({
            latitude: (Number(__VLS_ctx.selectedEventDetails.latitude)),
            longitude: (Number(__VLS_ctx.selectedEventDetails.longitude)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_15));
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "event-details-map-missing" },
        });
        /** @type {__VLS_StyleScopedClasses['event-details-map-missing']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
        ...{ class: "event-details-directions" },
        href: (__VLS_ctx.getEventDirectionsUrl(__VLS_ctx.selectedEventDetails)),
        target: "_blank",
        rel: "noopener noreferrer",
    });
    /** @type {__VLS_StyleScopedClasses['event-details-directions']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        'aria-hidden': "true",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "event-details-actions" },
    });
    /** @type {__VLS_StyleScopedClasses['event-details-actions']} */ ;
    if (__VLS_ctx.user?.role === 'owner' || __VLS_ctx.user?.role === 'admin') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.editEventFromDetails) },
            type: "button",
            ...{ class: "event-details-edit" },
        });
        /** @type {__VLS_StyleScopedClasses['event-details-edit']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.closeEventDetails) },
        type: "button",
        ...{ class: "event-details-done" },
    });
    /** @type {__VLS_StyleScopedClasses['event-details-done']} */ ;
}
// @ts-ignore
[user, user, formatDate, formatDate, formatTime, isNewAnnouncement, isNewAnnouncement, eventStatus, closeResetPassword, resetConfirmationVisible, resetConfirmationVisible, resetPasswordLoading, resetPasswordLoading, selectedEventDetails, selectedEventDetails, selectedEventDetails, selectedEventDetails, selectedEventDetails, selectedEventDetails, selectedEventDetails, selectedEventDetails, selectedEventDetails, selectedEventDetails, selectedEventDetails, selectedEventDetails, selectedEventDetails, selectedEventDetails, selectedEventDetails, selectedEventDetails, selectedEventDetails, selectedEventDetails, selectedEventDetails, selectedEventDetails, selectedEventDetails, selectedEventDetails, selectedEventDetails, closeEventDetails, closeEventDetails, closeEventDetails, closeEventDetails, hasPreciseEventLocation, getEventDirectionsUrl, editEventFromDetails,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
