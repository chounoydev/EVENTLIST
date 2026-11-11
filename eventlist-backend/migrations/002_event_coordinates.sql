ALTER TABLE eventlist.events
    ADD COLUMN latitude DOUBLE PRECISION,
    ADD COLUMN longitude DOUBLE PRECISION,
    ADD CONSTRAINT events_coordinates_pair_check
        CHECK ((latitude IS NULL) = (longitude IS NULL)),
    ADD CONSTRAINT events_latitude_range_check
        CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
    ADD CONSTRAINT events_longitude_range_check
        CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);
