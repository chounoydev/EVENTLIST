FROM php:8.3-cli

RUN apt-get update \
    && apt-get install -y git unzip libpq-dev libonig-dev libzip-dev libpng-dev libjpeg62-turbo-dev \
    && docker-php-ext-configure gd --with-jpeg \
    && docker-php-ext-install pdo pdo_pgsql pgsql mbstring zip gd bcmath \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY . .

RUN composer install --no-dev --optimize-autoloader --no-interaction \
    && php artisan config:clear \
    && php artisan route:cache

CMD php artisan storage:link 2>/dev/null || true; php artisan migrate --force && php artisan serve --host=0.0.0.0 --port=${PORT:-8080}
