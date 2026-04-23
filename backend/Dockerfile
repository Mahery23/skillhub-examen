# ═══════════════════════════════════════════
# Stage 1 — builder
# Rôle : installer toutes les dépendances PHP
# Cette image ne sera PAS utilisée en production
# ═══════════════════════════════════════════
FROM php:8.3-cli-alpine AS builder

# --- Outils système ---
# Ces paquets sont nécessaires pour compiler les extensions PHP
RUN apk add --no-cache \
        libpng-dev \
        libzip-dev \
        unzip \
        curl \
        autoconf \
        g++ \
        make \
        openssl-dev

# --- Extensions PHP ---
# pdo + pdo_mysql → connexion à MySQL
# zip → nécessaire pour Composer
# bcmath → calculs précis (utilisé par Laravel)
# gd → manipulation d'images
RUN docker-php-ext-install pdo pdo_mysql zip bcmath gd

# --- Extension MongoDB ---
# Non incluse dans PHP de base, on passe par PECL
RUN pecl install mongodb && docker-php-ext-enable mongodb

# --- Composer ---
# On le copie depuis son image officielle (plus propre qu'un curl)
COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# --- Dépendances ---
# On copie composer.json EN PREMIER (avant le reste du code)
# Astuce Docker : si ces fichiers n'ont pas changé, le cache est réutilisé
# → les dépendances ne sont pas réinstallées à chaque build
COPY composer.json composer.lock ./

# On inclut les deps de dev (PHPUnit, Collision, Pint) pour que `php artisan test`
# fonctionne dans le container. Overhead : ~20 MB, negligeable pour ce projet.
RUN composer install \
        --optimize-autoloader \
        --no-interaction \
        --no-scripts

# --- Code source ---
COPY . .

# --- Dossiers requis par Laravel ---
RUN mkdir -p \
        storage/logs \
        storage/framework/cache \
        storage/framework/sessions \
        storage/framework/views \
        bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache


# ═══════════════════════════════════════════
# Stage 2 — runtime
# ═══════════════════════════════════════════
FROM php:8.3-fpm-alpine AS runtime

RUN apk add --no-cache \
        libpng-dev \
        libzip-dev \
        autoconf \
        g++ \
        make \
        openssl-dev \
        nginx \
        supervisor \
        curl

RUN docker-php-ext-install pdo pdo_mysql zip bcmath gd
RUN pecl install mongodb && docker-php-ext-enable mongodb

# pcov : extension de code coverage (utilisee par PHPUnit).
# Beaucoup plus rapide que xdebug, uniquement activee quand PHPUnit le demande.
RUN pecl install pcov && docker-php-ext-enable pcov

WORKDIR /var/www/html

COPY --from=builder /app .

RUN chown -R www-data:www-data storage bootstrap/cache

# Configuration nginx pour Laravel
COPY docker/nginx.conf /etc/nginx/http.d/default.conf

# Supervisor gère nginx + php-fpm ensemble
COPY docker/supervisord.conf /etc/supervisord.conf

ENV APP_ENV=production
ENV APP_DEBUG=false

EXPOSE 8000

CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisord.conf"]