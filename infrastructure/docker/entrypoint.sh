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

# Ensure container can reach compose services even if .env was copied from host defaults.
php -r "
\$env = file_get_contents('.env');
\$replacements = [
  '/^DB_HOST=.*/m' => 'DB_HOST=postgres',
  '/^REDIS_HOST=.*/m' => 'REDIS_HOST=redis',
  '/^APP_URL=.*/m' => 'APP_URL=http://localhost:8081',
  '/^CACHE_STORE=.*/m' => 'CACHE_STORE=redis',
  '/^QUEUE_CONNECTION=.*/m' => 'QUEUE_CONNECTION=redis',
  '/^SESSION_DRIVER=.*/m' => 'SESSION_DRIVER=array',
  '/^REDIS_CLIENT=.*/m' => 'REDIS_CLIENT=phpredis',
];
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

mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache storage/app/public
chmod -R ug+rwx storage bootstrap/cache || true
php artisan storage:link --force >/dev/null 2>&1 || true

php artisan migrate --force --no-interaction || true

# First boot / empty DB: seed demo tenant, admin/agent/customer, banners.
# Identity/Wallet/Banner seeders are idempotent (updateOrCreate / skip if funded).
USER_COUNT="$(php -r "require 'vendor/autoload.php'; \$app=require 'bootstrap/app.php'; \$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap(); echo App\Models\User::query()->count();" 2>/dev/null || echo 0)"
if [ "$USER_COUNT" = "0" ]; then
  echo "No users found — seeding demo accounts and catalogue..."
  php artisan db:seed --force --no-interaction || true
fi

echo "Starting NextGen API on :8080"
exec php artisan serve --host=0.0.0.0 --port=8080
