import { onBeforeUnmount, reactive, ref, watch } from 'vue';
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
const emptyForm = () => ({
    title: '',
    description: '',
    location: '',
    event_date: '',
    event_time: '',
    organizer: '',
    capacity: 0,
});
const form = reactive(emptyForm());
function clearPreview() {
    if (previewUrl.value.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl.value);
    }
    previewUrl.value = '';
}
watch(() => props.initialEvent, (event) => {
    Object.assign(form, emptyForm(), event || {});
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
    emit('submit', {
        ...form,
        capacity: Number(form.capacity),
        event_time: form.event_time || null,
        description: form.description || null,
        organizer: form.organizer || null,
        cover_image: coverImage.value,
        remove_image: removeExistingImage.value,
    });
}
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
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "field-required" },
});
/** @type {__VLS_StyleScopedClasses['field-required']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    required: true,
    maxlength: "255",
    placeholder: "Venue or address",
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
            [submitForm, initialEvent, initialEvent, initialEvent, initialEvent, form, form, form, form, form, form, form, previewUrl, previewUrl, previewUrl, removeExistingImage, fileInput,];
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
