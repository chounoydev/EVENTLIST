export default {};
const __VLS_ctx = {};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
    ...{ class: "event-card" },
});
/** @type {__VLS_StyleScopedClasses['event-card']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "event-card-top" },
});
/** @type {__VLS_StyleScopedClasses['event-card-top']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "category-badge" },
});
/** @type {__VLS_StyleScopedClasses['category-badge']} */ ;
(__VLS_ctx.event.category);
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.toggleFavorite) },
    type: "button",
    ...{ class: "favorite-button" },
    ...{ class: ({ favorite: __VLS_ctx.event.favorite }) },
    title: (__VLS_ctx.event.favorite
        ? 'Remove from favorites'
        : 'Add to favorites'),
});
/** @type {__VLS_StyleScopedClasses['favorite-button']} */ ;
/** @type {__VLS_StyleScopedClasses['favorite']} */ ;
(__VLS_ctx.event.favorite ? '♥' : '♡');
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "event-date" },
});
/** @type {__VLS_StyleScopedClasses['event-date']} */ ;
(__VLS_ctx.formatDate(__VLS_ctx.event.date));
__VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
(__VLS_ctx.event.title);
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "event-description" },
});
/** @type {__VLS_StyleScopedClasses['event-description']} */ ;
(__VLS_ctx.event.description);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "event-details" },
});
/** @type {__VLS_StyleScopedClasses['event-details']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
(__VLS_ctx.event.time);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
(__VLS_ctx.event.location);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "event-status-row" },
});
/** @type {__VLS_StyleScopedClasses['event-status-row']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "status-badge" },
    ...{ class: ({
            upcoming: __VLS_ctx.event.status === 'Upcoming',
            ongoing: __VLS_ctx.event.status === 'Ongoing',
            completed: __VLS_ctx.event.status === 'Completed',
        }) },
});
/** @type {__VLS_StyleScopedClasses['status-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['upcoming']} */ ;
/** @type {__VLS_StyleScopedClasses['ongoing']} */ ;
/** @type {__VLS_StyleScopedClasses['completed']} */ ;
if (__VLS_ctx.event.status === 'Upcoming') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
}
else if (__VLS_ctx.event.status === 'Ongoing') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "event-actions" },
});
/** @type {__VLS_StyleScopedClasses['event-actions']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.changeStatus) },
    type: "button",
    ...{ class: "status-button" },
});
/** @type {__VLS_StyleScopedClasses['status-button']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.deleteEvent) },
    type: "button",
    ...{ class: "delete-button" },
});
/** @type {__VLS_StyleScopedClasses['delete-button']} */ ;
// @ts-ignore
[event, event, event, event, event, event, event, event, event, event, event, event, event, event, toggleFavorite, formatDate, changeStatus, deleteEvent,];
const __VLS_export = (await import('vue')).defineComponent({
    name: 'EventCard',
    props: {
        event: {
            type: Object,
            required: true,
        },
    },
    emits: [
        'toggle-favorite',
        'delete-event',
        'change-status',
    ],
    methods: {
        toggleFavorite() {
            this.$emit('toggle-favorite', this.event.id);
        },
        deleteEvent() {
            this.$emit('delete-event', this.event.id);
        },
        changeStatus() {
            this.$emit('change-status', this.event.id);
        },
        formatDate(date) {
            const parsedDate = new Date(`${date}T00:00:00`);
            return parsedDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            });
        },
    },
});
