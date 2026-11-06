import EventCard from './EventCard.vue';
export default {};
const __VLS_ctx = {};
const __VLS_componentsOption = {
    EventCard,
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({});
if (__VLS_ctx.events.length > 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "events-grid" },
    });
    /** @type {__VLS_StyleScopedClasses['events-grid']} */ ;
    for (const [event] of __VLS_vFor((__VLS_ctx.events))) {
        let __VLS_0;
        /** @ts-ignore @type { | typeof __VLS_components.EventCard} */
        EventCard;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
            ...{ 'onToggleFavorite': {} },
            ...{ 'onDeleteEvent': {} },
            ...{ 'onChangeStatus': {} },
            key: (event.id),
            event: (event),
        }));
        const __VLS_2 = __VLS_1({
            ...{ 'onToggleFavorite': {} },
            ...{ 'onDeleteEvent': {} },
            ...{ 'onChangeStatus': {} },
            key: (event.id),
            event: (event),
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        let __VLS_5;
        const __VLS_6 = {
            /** @type {typeof __VLS_5.toggleFavorite} */
            onToggleFavorite: (...[$event]) => {
                if (!(__VLS_ctx.events.length > 0))
                    throw 0;
                return (__VLS_ctx.$emit('toggle-favorite', $event));
                // @ts-ignore
                [events, events, $emit,];
            },
        };
        const __VLS_7 = {
            /** @type {typeof __VLS_5.deleteEvent} */
            onDeleteEvent: (...[$event]) => {
                if (!(__VLS_ctx.events.length > 0))
                    throw 0;
                return (__VLS_ctx.$emit('delete-event', $event));
                // @ts-ignore
                [$emit,];
            },
        };
        const __VLS_8 = {
            /** @type {typeof __VLS_5.changeStatus} */
            onChangeStatus: (...[$event]) => {
                if (!(__VLS_ctx.events.length > 0))
                    throw 0;
                return (__VLS_ctx.$emit('change-status', $event));
                // @ts-ignore
                [$emit,];
            },
        };
        var __VLS_3;
        var __VLS_4;
        // @ts-ignore
        [];
    }
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "empty-state" },
    });
    /** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "empty-icon" },
    });
    /** @type {__VLS_StyleScopedClasses['empty-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    name: 'EventList',
    components: {
        EventCard,
    },
    props: {
        events: {
            type: Array,
            required: true,
        },
    },
    emits: [
        'toggle-favorite',
        'delete-event',
        'change-status',
    ],
});
