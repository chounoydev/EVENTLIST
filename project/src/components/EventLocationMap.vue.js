import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
const props = defineProps({
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    previewLatitude: { type: Number, default: null },
    previewLongitude: { type: Number, default: null },
    interactive: { type: Boolean, default: false },
});
const emit = defineEmits(['select-location', 'invalid-location']);
const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim();
const mapElement = ref(null);
const mapError = ref('');
let map;
let marker;
let unmounted = false;
function validCoordinates() {
    return Number.isFinite(props.latitude) && props.latitude >= -90 && props.latitude <= 90
        && Number.isFinite(props.longitude) && props.longitude >= -180 && props.longitude <= 180;
}
function currentCoordinates() {
    if (validCoordinates())
        return [props.longitude, props.latitude];
    if (validPreviewCoordinates())
        return [props.previewLongitude, props.previewLatitude];
    return [120.9842, 14.5995];
}
function validPreviewCoordinates() {
    return Number.isFinite(props.previewLatitude) && props.previewLatitude >= 4 && props.previewLatitude <= 21.5
        && Number.isFinite(props.previewLongitude) && props.previewLongitude >= 116 && props.previewLongitude <= 127;
}
function selectMapPoint(longitude, latitude) {
    if (!props.interactive)
        return;
    if (longitude < 116 || longitude > 127 || latitude < 4 || latitude > 21.5) {
        emit('invalid-location');
        return;
    }
    previewMarker?.remove();
    previewMarker = undefined;
    marker?.setLngLat([longitude, latitude]);
    emit('select-location', { latitude, longitude });
}
async function createMap() {
    if (!token || !mapElement.value)
        return;
    try {
        const [{ default: mapboxgl }] = await Promise.all([
            import('mapbox-gl'),
            import('mapbox-gl/dist/mapbox-gl.css'),
        ]);
        if (unmounted || !mapElement.value)
            return;
        const hasCoordinates = validCoordinates();
        const hasPreview = !hasCoordinates && validPreviewCoordinates();
        map = new mapboxgl.Map({
            accessToken: token,
            container: mapElement.value,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: currentCoordinates(),
            zoom: hasCoordinates || hasPreview ? 15 : 5,
            maxBounds: [[116, 4], [127, 21.5]],
            attributionControl: true,
        });
        if (hasCoordinates) {
            marker = new mapboxgl.Marker({ color: '#0c5848', draggable: props.interactive })
                .setLngLat(currentCoordinates())
                .addTo(map);
            marker.on('dragend', () => {
                const coordinates = marker.getLngLat();
                selectMapPoint(coordinates.lng, coordinates.lat);
            });
        }
        else if (hasPreview) {
            previewMarker = new mapboxgl.Marker({ color: '#b67a23' })
                .setLngLat(currentCoordinates())
                .addTo(map);
        }
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
        if (props.interactive) {
            map.on('click', (event) => selectMapPoint(event.lngLat.lng, event.lngLat.lat));
        }
        map.on('error', (event) => {
            if (event.error?.status === 401 || event.error?.status === 403) {
                mapError.value = 'Mapbox could not load this map. Check the public access token configuration.';
            }
        });
    }
    catch {
        mapError.value = 'The map could not be loaded. Use the directions link instead.';
    }
}
let previewMarker;
watch(() => [props.latitude, props.longitude, props.previewLatitude, props.previewLongitude], ([latitude, longitude, previewLatitude, previewLongitude]) => {
    if (!map)
        return;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        if (props.interactive) {
            marker?.remove();
            marker = undefined;
            if (Number.isFinite(previewLatitude) && Number.isFinite(previewLongitude)) {
                const previewCoordinates = [previewLongitude, previewLatitude];
                map.flyTo({ center: previewCoordinates, zoom: 15 });
                if (previewMarker)
                    previewMarker.setLngLat(previewCoordinates);
                else {
                    import('mapbox-gl').then(({ default: mapboxgl }) => {
                        if (!unmounted && map && !previewMarker && !marker) {
                            previewMarker = new mapboxgl.Marker({ color: '#b67a23' })
                                .setLngLat(previewCoordinates)
                                .addTo(map);
                        }
                    });
                }
            }
            else {
                previewMarker?.remove();
                previewMarker = undefined;
                map.flyTo({ center: [120.9842, 14.5995], zoom: 5 });
            }
        }
        return;
    }
    const coordinates = [longitude, latitude];
    previewMarker?.remove();
    previewMarker = undefined;
    map.flyTo({ center: coordinates, zoom: 15 });
    if (marker) {
        marker.setLngLat(coordinates);
    }
    else {
        import('mapbox-gl').then(({ default: mapboxgl }) => {
            if (!unmounted && map && !marker) {
                marker = new mapboxgl.Marker({ color: '#0c5848', draggable: props.interactive })
                    .setLngLat(coordinates)
                    .addTo(map);
                marker.on('dragend', () => {
                    const point = marker.getLngLat();
                    selectMapPoint(point.lng, point.lat);
                });
            }
        });
    }
});
onMounted(createMap);
onBeforeUnmount(() => {
    unmounted = true;
    map?.remove();
    marker = undefined;
    previewMarker = undefined;
});
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
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "event-location-map-frame" },
});
/** @type {__VLS_StyleScopedClasses['event-location-map-frame']} */ ;
if (__VLS_ctx.token) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ref: "mapElement",
        ...{ class: "event-location-map" },
        ...{ class: ({ 'event-location-map-interactive': __VLS_ctx.interactive }) },
        'aria-label': (__VLS_ctx.interactive ? 'Click the map or drag the pin to select the exact event location' : 'Map showing the event location'),
    });
    /** @type {__VLS_StyleScopedClasses['event-location-map']} */ ;
    /** @type {__VLS_StyleScopedClasses['event-location-map-interactive']} */ ;
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "event-location-map-message" },
    });
    /** @type {__VLS_StyleScopedClasses['event-location-map-message']} */ ;
}
if (__VLS_ctx.mapError) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "event-location-map-message" },
        role: "status",
    });
    /** @type {__VLS_StyleScopedClasses['event-location-map-message']} */ ;
    (__VLS_ctx.mapError);
}
// @ts-ignore
[token, interactive, interactive, mapError, mapError,];
const __VLS_export = (await import('vue')).defineComponent({
    emits: {},
    props: {
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null },
        previewLatitude: { type: Number, default: null },
        previewLongitude: { type: Number, default: null },
        interactive: { type: Boolean, default: false },
    },
});
export default {};
