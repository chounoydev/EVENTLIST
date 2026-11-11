import assert from 'node:assert/strict'
import test from 'node:test'
import { parseBody } from './errors.js'
import { eventSchema, heroSlideSchema, registerSchema } from './validation.js'

test('registration normalizes email and requires matching passwords', () => {
  const result = parseBody(registerSchema, {
    name: ' Event Organizer ',
    email: '  ORGANIZER@example.com ',
    password: 'secure-pass-123',
    password_confirmation: 'secure-pass-123',
  })

  assert.equal(result.email, 'organizer@example.com')
  assert.equal(result.name, 'Event Organizer')
})

test('event input accepts multipart fields and normalizes optional values', () => {
  const result = parseBody(eventSchema, {
    title: 'Community market',
    description: '',
    location: 'Town hall',
    event_date: '2026-11-18',
    event_time: '09:30',
    organizer: '',
    capacity: '0',
    remove_image: '1',
  })

  assert.equal(result.description, null)
  assert.equal(result.capacity, 0)
  assert.equal(result.remove_image, true)
  assert.equal(result.latitude, null)
  assert.equal(result.longitude, null)
})

test('event coordinates must be a valid latitude/longitude pair', () => {
  const event = {
    title: 'Community market',
    location: 'Town hall',
    event_date: '2026-11-18',
    capacity: '0',
  }
  const result = parseBody(eventSchema, { ...event, latitude: '14.5995', longitude: '120.9842' })
  assert.equal(result.latitude, 14.5995)
  assert.equal(result.longitude, 120.9842)

  assert.throws(() => parseBody(eventSchema, { ...event, latitude: '91', longitude: '120.9842' }))
  assert.throws(() => parseBody(eventSchema, { ...event, latitude: '14.5995' }))
})

test('invalid event dates and slide flags are rejected', () => {
  assert.throws(() => parseBody(eventSchema, {
    title: 'Bad date',
    location: 'Town hall',
    event_date: '2026-02-30',
    capacity: 10,
  }))

  assert.throws(() => parseBody(heroSlideSchema, {
    eyebrow: 'Hello',
    title: 'Title',
    description: 'Description',
    art_text: 'Art',
    symbol: '✦',
    sort_order: '1',
    is_active: 'maybe',
  }))
})

test('passwords stay within bcrypt byte limits and event capacity fits PostgreSQL INTEGER', () => {
  const maximumLengthPassword = 'a'.repeat(72)
  assert.equal(parseBody(registerSchema, {
    name: 'Event Organizer',
    email: 'organizer@example.com',
    password: maximumLengthPassword,
    password_confirmation: maximumLengthPassword,
  }).password, maximumLengthPassword)

  assert.throws(() => parseBody(registerSchema, {
    name: 'Event Organizer',
    email: 'organizer@example.com',
    password: `${'a'.repeat(71)}é`,
    password_confirmation: `${'a'.repeat(71)}é`,
  }))

  assert.equal(parseBody(eventSchema, {
    title: 'Large event',
    location: 'Town hall',
    event_date: '2026-11-18',
    capacity: '2147483647',
  }).capacity, 2_147_483_647)

  assert.throws(() => parseBody(eventSchema, {
    title: 'Large event',
    location: 'Town hall',
    event_date: '2026-11-18',
    capacity: '2147483648',
  }))
})
