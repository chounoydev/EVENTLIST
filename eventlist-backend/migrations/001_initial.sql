CREATE TABLE eventlist.users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(16) NOT NULL DEFAULT 'user'
        CHECK (role IN ('user', 'admin', 'owner')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE eventlist.auth_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES eventlist.users(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX auth_tokens_user_id_idx ON eventlist.auth_tokens(user_id);
CREATE INDEX auth_tokens_expires_at_idx ON eventlist.auth_tokens(expires_at);

CREATE TABLE eventlist.password_reset_tokens (
    email VARCHAR(255) PRIMARY KEY,
    token_hash CHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE eventlist.events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME,
    organizer VARCHAR(255),
    capacity INTEGER NOT NULL DEFAULT 0 CHECK (capacity >= 0),
    image_path VARCHAR(512),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX events_date_time_id_idx ON eventlist.events(event_date, event_time, id);

CREATE TABLE eventlist.hero_slides (
    id SERIAL PRIMARY KEY,
    eyebrow VARCHAR(100) NOT NULL,
    title VARCHAR(160) NOT NULL,
    description VARCHAR(500) NOT NULL,
    art_text VARCHAR(80) NOT NULL,
    symbol VARCHAR(12) NOT NULL DEFAULT '✦',
    sort_order SMALLINT NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 999),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX hero_slides_active_sort_idx ON eventlist.hero_slides(is_active, sort_order, id);

INSERT INTO eventlist.hero_slides (eyebrow, title, description, art_text, symbol, sort_order)
SELECT 'YOUR NEXT GOOD DAY STARTS HERE',
       'Find your people. | Make a memory.',
       'Explore upcoming events and find something worth looking forward to.',
       'Make | it a | moment.',
       '✦',
       0
WHERE NOT EXISTS (SELECT 1 FROM eventlist.hero_slides);

INSERT INTO eventlist.hero_slides (eyebrow, title, description, art_text, symbol, sort_order)
SELECT 'BRING YOUR COMMUNITY TOGETHER',
       'Good plans. | Better together.',
       'From local celebrations to shared interests, discover a reason to get together.',
       'Meet | share | repeat.',
       '✳',
       1
WHERE NOT EXISTS (SELECT 1 FROM eventlist.hero_slides WHERE sort_order = 1);

INSERT INTO eventlist.hero_slides (eyebrow, title, description, art_text, symbol, sort_order)
SELECT 'THERE IS ALWAYS SOMETHING HAPPENING',
       'Your next story | starts here.',
       'Find fresh announcements and make space for the moments that matter.',
       'Find | your | next.',
       '✧',
       2
WHERE NOT EXISTS (SELECT 1 FROM eventlist.hero_slides WHERE sort_order = 2);
