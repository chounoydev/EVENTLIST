
<script setup>
import { onBeforeUnmount, reactive, ref, watch } from 'vue'

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

const emptyForm = () => ({
  title: '',
  description: '',
  location: '',
  event_date: '',
  event_time: '',
  organizer: '',
  capacity: 0,
})

const form = reactive(emptyForm())

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
  emit('submit', {
    ...form,
    capacity: Number(form.capacity),
    event_time: form.event_time || null,
    description: form.description || null,
    organizer: form.organizer || null,
    cover_image: coverImage.value,
    remove_image: removeExistingImage.value,
  })
}

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
        <span>Location <span class="field-required">Required</span></span>
        <input v-model.trim="form.location" required maxlength="255" placeholder="Venue or address" />
      </label>

      <label class="form-field">
        <span>Organizer</span>
        <input v-model.trim="form.organizer" maxlength="255" placeholder="Name or team" />
      </label>

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
