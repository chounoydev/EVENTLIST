<script lang="ts">
import EventCard from './EventCard.vue'

interface EventItem {
  id: number
  title: string
  date: string
  time: string
  location: string
  category: string
  description: string
  status: 'Upcoming' | 'Ongoing' | 'Completed'
  favorite: boolean
}

export default {
  name: 'EventList',

  components: {
    EventCard,
  },

  props: {
    events: {
      type: Array as () => EventItem[],
      required: true,
    },
  },

  emits: [
    'toggle-favorite',
    'delete-event',
    'change-status',
  ],
}
</script>

<template>
  <section>
    <!-- EVENTS -->
    <div
      v-if="events.length > 0"
      class="events-grid"
    >
      <EventCard
        v-for="event in events"
        :key="event.id"
        :event="event"
        @toggle-favorite="$emit('toggle-favorite', $event)"
        @delete-event="$emit('delete-event', $event)"
        @change-status="$emit('change-status', $event)"
      />
    </div>

    <!-- EMPTY STATE -->
    <div
      v-else
      class="empty-state"
    >
      <div class="empty-icon">
        📭
      </div>

      <h3>
        No events found
      </h3>

      <p>
        There are no events that match your current
        search or filter.
      </p>
    </div>
  </section>
</template>