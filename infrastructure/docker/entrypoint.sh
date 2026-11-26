#!/bin/sh
set -e

cd /var/www/html

if [ ! -f composer.json ]; then
  echo "apps/api is missing composer.json"
  exit 1
fi

if [ ! -f vendor/autoload.php ]; then
  echo "Installing Composer dependencies (no-dev, Linux vendor volume)..."
  composer install --no-interaction --prefer-dist --no-dev --optimize-autoloader
fi

if [ ! -f .env ]; then
  cp .env.example .env
fi

# Prefer compose/runtime env when present; otherwise use Docker service names/ports.
APP_URL_VAL="${APP_URL:-http://localhost:8081}"
CORS_VAL="${CORS_ALLOWED_ORIGINS:-}"
DB_HOST_VAL="${DB_HOST:-postgres}"
DB_PORT_VAL="${DB_PORT:-5432}"
DB_DATABASE_VAL="${DB_DATABASE:-nextgen_sportsbook}"
DB_USERNAME_VAL="${DB_USERNAME:-nextgen}"
DB_PASSWORD_VAL="${DB_PASSWORD:-nextgen_dev_only}"
REDIS_HOST_VAL="${REDIS_HOST:-redis}"
REDIS_PORT_VAL="${REDIS_PORT:-6379}"

php -r "
\$env = file_get_contents('.env');
\$replacements = [
  '/^DB_CONNECTION=.*/m' => 'DB_CONNECTION=pgsql',
  '/^DB_HOST=.*/m' => 'DB_HOST=${DB_HOST_VAL}',
  '/^DB_PORT=.*/m' => 'DB_PORT=${DB_PORT_VAL}',
  '/^DB_DATABASE=.*/m' => 'DB_DATABASE=${DB_DATABASE_VAL}',
  '/^DB_USERNAME=.*/m' => 'DB_USERNAME=${DB_USERNAME_VAL}',
  '/^DB_PASSWORD=.*/m' => 'DB_PASSWORD=${DB_PASSWORD_VAL}',
  '/^REDIS_HOST=.*/m' => 'REDIS_HOST=${REDIS_HOST_VAL}',
  '/^REDIS_PORT=.*/m' => 'REDIS_PORT=${REDIS_PORT_VAL}',
  '/^REDIS_CLIENT=.*/m' => 'REDIS_CLIENT=phpredis',
  '/^APP_URL=.*/m' => 'APP_URL=${APP_URL_VAL}',
  '/^CACHE_STORE=.*/m' => 'CACHE_STORE=redis',
  '/^QUEUE_CONNECTION=.*/m' => 'QUEUE_CONNECTION=redis',
  '/^SESSION_DRIVER=.*/m' => 'SESSION_DRIVER=array',
];
if ('${CORS_VAL}' !== '') {
  \$replacements['/^CORS_ALLOWED_ORIGINS=.*/m'] = 'CORS_ALLOWED_ORIGINS=${CORS_VAL}';
}
foreach (\$replacements as \$pattern => \$line) {
  if (preg_match(\$pattern, \$env)) {
    \$env = preg_replace(\$pattern, \$line, \$env);
  } else {
    \$env .= PHP_EOL . \$line;
  }
}
file_put_contents('.env', \$env);
"

if ! grep -q '^APP_KEY=base64:' .env; then
  php artisan key:generate --force --ansi
fi

# Drop stale config cache that can pin wrong DB/Redis hosts from image build.
php artisan config:clear --no-interaction >/dev/null 2>&1 || true
rm -f bootstrap/cache/config.php

mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache storage/app/public
chmod -R ug+rwx storage bootstrap/cache || true
php artisan storage:link --force >/dev/null 2>&1 || true

php artisan migrate --force --no-interaction || true

# First boot / empty DB: seed demo tenant, admin/agent/customer, banners.
USER_COUNT="$(php -r "require 'vendor/autoload.php'; \$app=require 'bootstrap/app.php'; \$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap(); echo App\Models\User::query()->count();" 2>/dev/null || echo 0)"
if [ "$USER_COUNT" = "0" ]; then
  echo "No users found — seeding demo accounts and catalogue..."
  php artisan db:seed --force --no-interaction || true
fi

echo "Starting NextGen API on :8080 (DB ${DB_HOST_VAL}:${DB_PORT_VAL}, Redis ${REDIS_HOST_VAL}:${REDIS_PORT_VAL})"
exec php artisan serve --host=0.0.0.0 --port=8080
