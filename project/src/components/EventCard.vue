<script lang="ts">
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
  name: 'EventCard',

  props: {
    event: {
      type: Object as () => EventItem,
      required: true,
    },
  },

  emits: [
    'toggle-favorite',
    'delete-event',
    'change-status',
  ],

  methods: {
    toggleFavorite(): void {
      this.$emit(
        'toggle-favorite',
        this.event.id,
      )
    },

    deleteEvent(): void {
      this.$emit(
        'delete-event',
        this.event.id,
      )
    },

    changeStatus(): void {
      this.$emit(
        'change-status',
        this.event.id,
      )
    },

    formatDate(date: string): string {
      const parsedDate = new Date(
        `${date}T00:00:00`,
      )

      return parsedDate.toLocaleDateString(
        'en-US',
        {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        },
      )
    },
  },
}
</script>

<template>
  <article class="event-card">
    <!-- TOP -->
    <div class="event-card-top">
      <span class="category-badge">
        {{ event.category }}
      </span>

      <button
        type="button"
        class="favorite-button"
        :class="{ favorite: event.favorite }"
        @click="toggleFavorite"
        :title="
          event.favorite
            ? 'Remove from favorites'
            : 'Add to favorites'
        "
      >
        {{ event.favorite ? '♥' : '♡' }}
      </button>
    </div>

    <!-- DATE -->
    <div class="event-date">
      📅 {{ formatDate(event.date) }}
    </div>

    <!-- TITLE -->
    <h3>
      {{ event.title }}
    </h3>

    <!-- DESCRIPTION -->
    <p class="event-description">
      {{ event.description }}
    </p>

    <!-- DETAILS -->
    <div class="event-details">
      <div>
        <span>🕐</span>
        <span>{{ event.time }}</span>
      </div>

      <div>
        <span>📍</span>
        <span>{{ event.location }}</span>
      </div>
    </div>

    <!-- STATUS -->
    <div class="event-status-row">
      <span
        class="status-badge"
        :class="{
          upcoming: event.status === 'Upcoming',
          ongoing: event.status === 'Ongoing',
          completed: event.status === 'Completed',
        }"
      >
        <span
          v-if="event.status === 'Upcoming'"
        >
          ● Upcoming
        </span>

        <span
          v-else-if="event.status === 'Ongoing'"
        >
          ● Ongoing
        </span>

        <span v-else>
          ● Completed
        </span>
      </span>
    </div>

    <!-- ACTIONS -->
    <div class="event-actions">
      <button
        type="button"
        class="status-button"
        @click="changeStatus"
      >
        Change Status
      </button>

      <button
        type="button"
        class="delete-button"
        @click="deleteEvent"
      >
        Remove
      </button>
    </div>
  </article>
</template>