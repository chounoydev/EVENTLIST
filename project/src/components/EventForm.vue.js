import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import EventLocationMap from './EventLocationMap.vue';
import { isMapboxConfigured, searchMapboxLocations } from '../services/mapboxService';
import { psgcService } from '../services/psgcService';
const props = defineProps({
    initialEvent: {
        type: Object,
        default: null,
    },
    loading: {
        type: Boolean,
        default: false,
    },
});
const emit = defineEmits(['submit', 'cancel']);
const coverImage = ref(null);
const previewUrl = ref('');
const removeExistingImage = ref(false);
const fileInput = ref(null);
const locationResults = ref([]);
const locationSearching = ref(false);
const locationError = ref('');
const selectedLocation = ref(null);
const mapPreviewLocation = ref(null);
const regions = ref([]);
const provinces = ref([]);
const cities = ref([]);
const regionLocalities = ref([]);
const submunicipalities = ref([]);
const barangays = ref([]);
const selectedRegionCode = ref('');
const selectedProvinceCode = ref('');
const selectedCityCode = ref('');
const selectedSubmunicipalityCode = ref('');
const selectedBarangayCode = ref('');
const locationDirectoryLoading = ref(false);
const retryLocationRequest = ref(null);
let locationSearchRequest = 0;
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
});
const form = reactive(emptyForm());
const selectedAdministrativeLocation = computed(() => {
    const selectedName = (items, code) => items.find((item) => item.code === code)?.name;
    return [
        selectedName(barangays.value, selectedBarangayCode.value),
        selectedName(submunicipalities.value, selectedSubmunicipalityCode.value),
        selectedName(cities.value, selectedCityCode.value),
        selectedName(provinces.value, selectedProvinceCode.value),
        selectedName(regions.value, selectedRegionCode.value),
    ].filter(Boolean).join(', ');
});
const locationSearchQuery = computed(() => [
    form.location.trim(),
    selectedAdministrativeLocation.value,
    'Philippines',
].filter(Boolean).join(', '));
function clearPreview() {
    if (previewUrl.value.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl.value);
    }
    previewUrl.value = '';
}
watch(() => props.initialEvent, (event) => {
    Object.assign(form, emptyForm(), event || {});
    locationResults.value = [];
    locationError.value = '';
    mapPreviewLocation.value = null;
    selectedLocation.value = event?.latitude != null && event?.longitude != null
        ? { label: event.location, latitude: Number(event.latitude), longitude: Number(event.longitude) }
        : null;
    selectedRegionCode.value = '';
    selectedProvinceCode.value = '';
    selectedCityCode.value = '';
    selectedSubmunicipalityCode.value = '';
    selectedBarangayCode.value = '';
    provinces.value = [];
    cities.value = [];
    regionLocalities.value = [];
    submunicipalities.value = [];
    barangays.value = [];
    coverImage.value = null;
    removeExistingImage.value = false;
    clearPreview();
    if (event?.event_date) {
        form.event_date = String(event.event_date).slice(0, 10);
    }
    if (event?.event_time) {
        form.event_time = String(event.event_time).slice(0, 5);
    }
}, { immediate: true });
function clearSelectedLocation() {
    locationSearchRequest += 1;
    retryLocationRequest.value = null;
    form.latitude = null;
    form.longitude = null;
    selectedLocation.value = null;
    mapPreviewLocation.value = null;
    locationResults.value = [];
    locationError.value = '';
}
function selectMapLocation(coordinates) {
    form.latitude = coordinates.latitude;
    form.longitude = coordinates.longitude;
    selectedLocation.value = {
        label: form.location || selectedAdministrativeLocation.value || 'Selected map pin',
        ...coordinates,
    };
    mapPreviewLocation.value = null;
    locationError.value = '';
    retryLocationRequest.value = null;
}
async function loadRegions() {
    locationDirectoryLoading.value = true;
    locationError.value = '';
    retryLocationRequest.value = null;
    try {
        regions.value = await psgcService.getRegions();
    }
    catch (error) {
        locationError.value = error instanceof Error ? error.message : 'Could not load Philippine locations.';
        retryLocationRequest.value = loadRegions;
    }
    finally {
        locationDirectoryLoading.value = false;
    }
}
async function selectRegion() {
    clearSelectedLocation();
    const regionCode = selectedRegionCode.value;
    selectedProvinceCode.value = '';
    selectedCityCode.value = '';
    selectedSubmunicipalityCode.value = '';
    selectedBarangayCode.value = '';
    provinces.value = [];
    cities.value = [];
    regionLocalities.value = [];
    submunicipalities.value = [];
    barangays.value = [];
    if (!regionCode)
        return;
    locationDirectoryLoading.value = true;
    try {
        const regionProvinces = await psgcService.getProvinces(regionCode);
        if (regionCode !== selectedRegionCode.value)
            return;
        provinces.value = regionProvinces;
        if (!regionProvinces.length) {
            const regionCities = await psgcService.getCitiesForRegion(regionCode);
            if (regionCode === selectedRegionCode.value) {
                regionLocalities.value = regionCities;
                cities.value = regionCities.filter((city) => city.type.toLowerCase() !== 'submun');
            }
        }
    }
    catch (error) {
        locationError.value = error instanceof Error ? error.message : 'Could not load provinces and cities.';
        retryLocationRequest.value = selectRegion;
    }
    finally {
        locationDirectoryLoading.value = false;
    }
}
async function selectProvince() {
    clearSelectedLocation();
    const provinceCode = selectedProvinceCode.value;
    selectedCityCode.value = '';
    selectedSubmunicipalityCode.value = '';
    selectedBarangayCode.value = '';
    cities.value = [];
    submunicipalities.value = [];
    barangays.value = [];
    if (!provinceCode)
        return;
    locationDirectoryLoading.value = true;
    try {
        const results = await psgcService.getCitiesForProvince(provinceCode);
        if (provinceCode === selectedProvinceCode.value)
            cities.value = results;
    }
    catch (error) {
        locationError.value = error instanceof Error ? error.message : 'Could not load cities and municipalities.';
        retryLocationRequest.value = selectProvince;
    }
    finally {
        locationDirectoryLoading.value = false;
    }
}
async function selectCity() {
    clearSelectedLocation();
    const cityCode = selectedCityCode.value;
    const city = cities.value.find((item) => item.code === cityCode);
    selectedSubmunicipalityCode.value = '';
    selectedBarangayCode.value = '';
    submunicipalities.value = [];
    barangays.value = [];
    if (!cityCode)
        return;
    locationDirectoryLoading.value = true;
    try {
        const results = await psgcService.getBarangays(cityCode);
        if (cityCode !== selectedCityCode.value)
            return;
        barangays.value = results;
        if (!results.length && city?.type.toLowerCase() === 'city') {
            submunicipalities.value = regionLocalities.value.filter((locality) => locality.type.toLowerCase() === 'submun' && locality.code.startsWith(cityCode.slice(0, 6)));
        }
    }
    catch (error) {
        locationError.value = error instanceof Error ? error.message : 'Could not load barangays.';
        retryLocationRequest.value = selectCity;
    }
    finally {
        locationDirectoryLoading.value = false;
    }
}
async function selectSubmunicipality() {
    clearSelectedLocation();
    const code = selectedSubmunicipalityCode.value;
    selectedBarangayCode.value = '';
    barangays.value = [];
    if (!code)
        return;
    locationDirectoryLoading.value = true;
    try {
        const results = await psgcService.getBarangays(code);
        if (code === selectedSubmunicipalityCode.value)
            barangays.value = results;
    }
    catch (error) {
        locationError.value = error instanceof Error ? error.message : 'Could not load barangays.';
        retryLocationRequest.value = selectSubmunicipality;
    }
    finally {
        locationDirectoryLoading.value = false;
    }
}
function selectBarangay() {
    clearSelectedLocation();
}
async function searchLocation() {
    const query = locationSearchQuery.value.trim();
    if (query.length < 3) {
        locationError.value = 'Enter a venue, address, or select a Philippine location first.';
        return;
    }
    const requestId = ++locationSearchRequest;
    locationSearching.value = true;
    locationError.value = '';
    locationResults.value = [];
    try {
        const results = await searchMapboxLocations(query);
        if (requestId !== locationSearchRequest)
            return;
        locationResults.value = results;
        if (!results.length)
            locationError.value = 'No matching map area found. Select the location directly on the map.';
    }
    catch (error) {
        if (requestId === locationSearchRequest) {
            locationError.value = error instanceof Error ? error.message : 'Could not search places right now.';
        }
    }
    finally {
        if (requestId === locationSearchRequest)
            locationSearching.value = false;
    }
}
function selectLocation(location) {
    locationSearchRequest += 1;
    locationSearching.value = false;
    form.latitude = null;
    form.longitude = null;
    selectedLocation.value = null;
    mapPreviewLocation.value = location;
    locationResults.value = [];
    locationError.value = 'Area found. Click the exact venue on the map or drag the pin there to save its location.';
}
function selectCoverImage(event) {
    const file = event.target.files?.[0];
    coverImage.value = file || null;
    removeExistingImage.value = false;
    clearPreview();
    if (file)
        previewUrl.value = URL.createObjectURL(file);
}
function removeCoverImage() {
    coverImage.value = null;
    clearPreview();
    removeExistingImage.value = Boolean(props.initialEvent?.image_url);
    if (fileInput.value)
        fileInput.value.value = '';
}
function submitForm() {
    if (!form.location.trim() && !selectedRegionCode.value) {
        locationError.value = 'Enter a venue or address, or select its Philippine region.';
        return;
    }
    const locationParts = [
        form.location.trim(),
        selectedAdministrativeLocation.value,
        'Philippines',
    ].filter((part, index, parts) => part
        && parts.findIndex((value) => value.toLocaleLowerCase() === part.toLocaleLowerCase()) === index);
    const fullLocation = locationParts.join(', ');
    if (!fullLocation) {
        locationError.value = 'Enter a venue or address, or select its province, city, and barangay.';
        return;
    }
    if (fullLocation.length > 255) {
        locationError.value = 'Shorten the venue or address so the complete location is no longer than 255 characters.';
        return;
    }
    if (isMapboxConfigured && (form.latitude == null || form.longitude == null)) {
        locationError.value = 'Choose the exact point on the map so attendees can see the right pin.';
        return;
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
    });
}
onMounted(loadRegions);
onBeforeUnmount(clearPreview);
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['event-form']} */ ;
/** @type {__VLS_StyleScopedClasses['location-select-field']} */ ;
/** @type {__VLS_StyleScopedClasses['location-select-field']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-admin-area']} */ ;
/** @type {__VLS_StyleScopedClasses['location-search-button']} */ ;
/** @type {__VLS_StyleScopedClasses['location-search-result']} */ ;
/** @type {__VLS_StyleScopedClasses['location-search-result']} */ ;
/** @type {__VLS_StyleScopedClasses['location-search-result']} */ ;
/** @type {__VLS_StyleScopedClasses['cover-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['cover-upload-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['cover-upload-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['cover-upload-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['cover-upload-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['event-form']} */ ;
/** @type {__VLS_StyleScopedClasses['event-form']} */ ;
/** @type {__VLS_StyleScopedClasses['event-form']} */ ;
/** @type {__VLS_StyleScopedClasses['event-form']} */ ;
/** @type {__VLS_StyleScopedClasses['event-form']} */ ;
/** @type {__VLS_StyleScopedClasses['form-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['form-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['form-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['form-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['event-form']} */ ;
/** @type {__VLS_StyleScopedClasses['form-fields']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['cover-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['cover-upload']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)({
    ...{ onSubmit: (__VLS_ctx.submitForm) },
    ...{ class: "event-form" },
});
/** @type {__VLS_StyleScopedClasses['event-form']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "form-header" },
});
/** @type {__VLS_StyleScopedClasses['form-header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "form-kicker" },
});
/** @type {__VLS_StyleScopedClasses['form-kicker']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
(__VLS_ctx.initialEvent ? 'Edit event' : 'Create event');
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "form-fields" },
});
/** @type {__VLS_StyleScopedClasses['form-fields']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ class: "form-field form-field-wide" },
});
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field-wide']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "field-required" },
});
/** @type {__VLS_StyleScopedClasses['field-required']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    required: true,
    maxlength: "255",
    placeholder: "Name your event",
});
(__VLS_ctx.form.title);
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ class: "form-field" },
});
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    ...{ onInput: (__VLS_ctx.clearSelectedLocation) },
    maxlength: "255",
    placeholder: "Venue, street, or landmark",
});
(__VLS_ctx.form.location);
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ class: "form-field" },
});
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    maxlength: "255",
    placeholder: "Name or team",
});
(__VLS_ctx.form.organizer);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "form-field form-field-wide location-picker" },
});
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['location-picker']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "location-picker-help" },
});
/** @type {__VLS_StyleScopedClasses['location-picker-help']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "location-hierarchy" },
});
/** @type {__VLS_StyleScopedClasses['location-hierarchy']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ class: "location-select-field" },
});
/** @type {__VLS_StyleScopedClasses['location-select-field']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    ...{ onChange: (__VLS_ctx.selectRegion) },
    value: (__VLS_ctx.selectedRegionCode),
    disabled: (__VLS_ctx.locationDirectoryLoading || !__VLS_ctx.regions.length),
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "",
});
(__VLS_ctx.locationDirectoryLoading && !__VLS_ctx.regions.length ? 'Loading regions…' : 'Select region');
for (const [region] of __VLS_vFor((__VLS_ctx.regions))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        key: (region.code),
        value: (region.code),
    });
    (region.name);
    // @ts-ignore
    [submitForm, initialEvent, form, form, form, clearSelectedLocation, selectRegion, selectedRegionCode, locationDirectoryLoading, locationDirectoryLoading, regions, regions, regions,];
}
if (__VLS_ctx.provinces.length) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "location-select-field" },
    });
    /** @type {__VLS_StyleScopedClasses['location-select-field']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
        ...{ onChange: (__VLS_ctx.selectProvince) },
        value: (__VLS_ctx.selectedProvinceCode),
        disabled: (__VLS_ctx.locationDirectoryLoading),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "",
    });
    for (const [province] of __VLS_vFor((__VLS_ctx.provinces))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            key: (province.code),
            value: (province.code),
        });
        (province.name);
        // @ts-ignore
        [locationDirectoryLoading, provinces, provinces, selectProvince, selectedProvinceCode,];
    }
}
if (__VLS_ctx.cities.length) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "location-select-field" },
    });
    /** @type {__VLS_StyleScopedClasses['location-select-field']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
        ...{ onChange: (__VLS_ctx.selectCity) },
        value: (__VLS_ctx.selectedCityCode),
        disabled: (__VLS_ctx.locationDirectoryLoading),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "",
    });
    for (const [city] of __VLS_vFor((__VLS_ctx.cities))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            key: (city.code),
            value: (city.code),
        });
        (city.name);
        // @ts-ignore
        [locationDirectoryLoading, cities, cities, selectCity, selectedCityCode,];
    }
}
if (__VLS_ctx.submunicipalities.length) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "location-select-field" },
    });
    /** @type {__VLS_StyleScopedClasses['location-select-field']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
        ...{ onChange: (__VLS_ctx.selectSubmunicipality) },
        value: (__VLS_ctx.selectedSubmunicipalityCode),
        disabled: (__VLS_ctx.locationDirectoryLoading),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "",
    });
    for (const [submunicipality] of __VLS_vFor((__VLS_ctx.submunicipalities))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            key: (submunicipality.code),
            value: (submunicipality.code),
        });
        (submunicipality.name);
        // @ts-ignore
        [locationDirectoryLoading, submunicipalities, submunicipalities, selectSubmunicipality, selectedSubmunicipalityCode,];
    }
}
if (__VLS_ctx.barangays.length) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "location-select-field" },
    });
    /** @type {__VLS_StyleScopedClasses['location-select-field']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
        ...{ onChange: (__VLS_ctx.selectBarangay) },
        value: (__VLS_ctx.selectedBarangayCode),
        disabled: (__VLS_ctx.locationDirectoryLoading),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "",
    });
    for (const [barangay] of __VLS_vFor((__VLS_ctx.barangays))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            key: (barangay.code),
            value: (barangay.code),
        });
        (barangay.name);
        // @ts-ignore
        [locationDirectoryLoading, barangays, barangays, selectBarangay, selectedBarangayCode,];
    }
}
if (__VLS_ctx.selectedAdministrativeLocation) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "selected-admin-area" },
        role: "status",
    });
    /** @type {__VLS_StyleScopedClasses['selected-admin-area']} */ ;
    (__VLS_ctx.selectedAdministrativeLocation);
}
if (!__VLS_ctx.isMapboxConfigured) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "location-picker-help" },
    });
    /** @type {__VLS_StyleScopedClasses['location-picker-help']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "location-search-row" },
});
/** @type {__VLS_StyleScopedClasses['location-search-row']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.searchLocation) },
    type: "button",
    ...{ class: "location-search-button" },
    disabled: (!__VLS_ctx.isMapboxConfigured || __VLS_ctx.locationSearching || __VLS_ctx.locationSearchQuery.trim().length < 3),
});
/** @type {__VLS_StyleScopedClasses['location-search-button']} */ ;
(__VLS_ctx.locationSearching ? 'Searching on map…' : 'Find area on map');
if (__VLS_ctx.selectedLocation) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "location-selected-status" },
        role: "status",
    });
    /** @type {__VLS_StyleScopedClasses['location-selected-status']} */ ;
    (__VLS_ctx.selectedLocation.latitude.toFixed(5));
    (__VLS_ctx.selectedLocation.longitude.toFixed(5));
}
else if (__VLS_ctx.mapPreviewLocation) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "location-preview-status" },
        role: "status",
    });
    /** @type {__VLS_StyleScopedClasses['location-preview-status']} */ ;
    (__VLS_ctx.mapPreviewLocation.label);
}
if (__VLS_ctx.locationError) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "location-picker-error" },
        role: "alert",
    });
    /** @type {__VLS_StyleScopedClasses['location-picker-error']} */ ;
    (__VLS_ctx.locationError);
}
if (__VLS_ctx.retryLocationRequest) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.retryLocationRequest))
                    throw 0;
                return (__VLS_ctx.retryLocationRequest());
                // @ts-ignore
                [selectedAdministrativeLocation, selectedAdministrativeLocation, isMapboxConfigured, isMapboxConfigured, searchLocation, locationSearching, locationSearching, locationSearchQuery, selectedLocation, selectedLocation, selectedLocation, mapPreviewLocation, mapPreviewLocation, locationError, locationError, retryLocationRequest, retryLocationRequest,];
            } },
        type: "button",
        ...{ class: "location-retry-button" },
    });
    /** @type {__VLS_StyleScopedClasses['location-retry-button']} */ ;
}
if (__VLS_ctx.locationResults.length) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "location-search-results" },
        'aria-label': "Map search results",
    });
    /** @type {__VLS_StyleScopedClasses['location-search-results']} */ ;
    for (const [location] of __VLS_vFor((__VLS_ctx.locationResults))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.locationResults.length))
                        throw 0;
                    return (__VLS_ctx.selectLocation(location));
                    // @ts-ignore
                    [locationResults, locationResults, selectLocation,];
                } },
            key: (location.id),
            type: "button",
            ...{ class: "location-search-result" },
        });
        /** @type {__VLS_StyleScopedClasses['location-search-result']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            'aria-hidden': "true",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (location.label);
        // @ts-ignore
        [];
    }
}
if (__VLS_ctx.isMapboxConfigured) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "location-picker-help" },
    });
    /** @type {__VLS_StyleScopedClasses['location-picker-help']} */ ;
}
if (__VLS_ctx.isMapboxConfigured) {
    const __VLS_0 = EventLocationMap;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        ...{ 'onSelectLocation': {} },
        ...{ 'onInvalidLocation': {} },
        latitude: (__VLS_ctx.selectedLocation?.latitude ?? null),
        longitude: (__VLS_ctx.selectedLocation?.longitude ?? null),
        previewLatitude: (__VLS_ctx.mapPreviewLocation?.latitude ?? null),
        previewLongitude: (__VLS_ctx.mapPreviewLocation?.longitude ?? null),
        interactive: true,
    }));
    const __VLS_2 = __VLS_1({
        ...{ 'onSelectLocation': {} },
        ...{ 'onInvalidLocation': {} },
        latitude: (__VLS_ctx.selectedLocation?.latitude ?? null),
        longitude: (__VLS_ctx.selectedLocation?.longitude ?? null),
        previewLatitude: (__VLS_ctx.mapPreviewLocation?.latitude ?? null),
        previewLongitude: (__VLS_ctx.mapPreviewLocation?.longitude ?? null),
        interactive: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    let __VLS_5;
    const __VLS_6 = {
        /** @type {typeof __VLS_5.selectLocation} */
        onSelectLocation: (__VLS_ctx.selectMapLocation),
    };
    const __VLS_7 = {
        /** @type {typeof __VLS_5.invalidLocation} */
        onInvalidLocation: (...[$event]) => {
            if (!(__VLS_ctx.isMapboxConfigured))
                throw 0;
            return (__VLS_ctx.locationError = 'Choose a point within the Philippines.');
            // @ts-ignore
            [isMapboxConfigured, isMapboxConfigured, selectedLocation, selectedLocation, mapPreviewLocation, mapPreviewLocation, locationError, selectMapLocation,];
        },
    };
    var __VLS_3;
    var __VLS_4;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ class: "form-field" },
});
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "field-required" },
});
/** @type {__VLS_StyleScopedClasses['field-required']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "date",
    required: true,
});
(__VLS_ctx.form.event_date);
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ class: "form-field" },
});
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "time",
});
(__VLS_ctx.form.event_time);
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ class: "form-field" },
});
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "number",
    min: "0",
    max: "4294967295",
    required: true,
});
(__VLS_ctx.form.capacity);
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ class: "form-field form-field-wide" },
});
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field-wide']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.textarea, __VLS_intrinsics.textarea)({
    value: (__VLS_ctx.form.description),
    rows: "3",
    placeholder: "Add a short event overview",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "form-field form-field-wide cover-field" },
});
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['cover-field']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "cover-upload" },
});
/** @type {__VLS_StyleScopedClasses['cover-upload']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "cover-preview" },
    ...{ class: ({ 'cover-preview-empty': !__VLS_ctx.previewUrl && !__VLS_ctx.initialEvent?.image_url }) },
});
/** @type {__VLS_StyleScopedClasses['cover-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['cover-preview-empty']} */ ;
if (__VLS_ctx.previewUrl || (!__VLS_ctx.removeExistingImage && __VLS_ctx.initialEvent?.image_url)) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.img)({
        src: (__VLS_ctx.previewUrl || __VLS_ctx.initialEvent.image_url),
        alt: "Event cover preview",
    });
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        'aria-hidden': "true",
    });
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "cover-upload-actions" },
});
/** @type {__VLS_StyleScopedClasses['cover-upload-actions']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return (__VLS_ctx.fileInput?.click());
            // @ts-ignore
            [initialEvent, initialEvent, initialEvent, form, form, form, form, previewUrl, previewUrl, previewUrl, removeExistingImage, fileInput,];
        } },
    type: "button",
    ...{ class: "choose-image-btn" },
});
/** @type {__VLS_StyleScopedClasses['choose-image-btn']} */ ;
(__VLS_ctx.previewUrl || (!__VLS_ctx.removeExistingImage && __VLS_ctx.initialEvent?.image_url) ? 'Choose a different image' : 'Choose image');
if (__VLS_ctx.previewUrl || (!__VLS_ctx.removeExistingImage && __VLS_ctx.initialEvent?.image_url)) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.removeCoverImage) },
        type: "button",
        ...{ class: "remove-image-btn" },
    });
    /** @type {__VLS_StyleScopedClasses['remove-image-btn']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    ...{ onChange: (__VLS_ctx.selectCoverImage) },
    ref: "fileInput",
    ...{ class: "cover-file-input" },
    type: "file",
    accept: "image/jpeg,image/png,image/gif,image/webp",
    'aria-label': "Choose event cover image",
});
/** @type {__VLS_StyleScopedClasses['cover-file-input']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "form-actions" },
});
/** @type {__VLS_StyleScopedClasses['form-actions']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return (__VLS_ctx.$emit('cancel'));
            // @ts-ignore
            [initialEvent, initialEvent, previewUrl, previewUrl, removeExistingImage, removeExistingImage, removeCoverImage, selectCoverImage, $emit,];
        } },
    type: "button",
    ...{ class: "cancel-btn" },
});
/** @type {__VLS_StyleScopedClasses['cancel-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    type: "submit",
    ...{ class: "save-btn" },
    disabled: (__VLS_ctx.loading),
});
/** @type {__VLS_StyleScopedClasses['save-btn']} */ ;
(__VLS_ctx.loading ? 'Saving...' : __VLS_ctx.initialEvent ? 'Save changes' : 'Create event');
// @ts-ignore
[initialEvent, loading, loading,];
const __VLS_export = (await import('vue')).defineComponent({
    emits: {},
    props: {
        initialEvent: {
            type: Object,
            default: null,
        },
        loading: {
            type: Boolean,
            default: false,
        },
    },
});
export default {};
