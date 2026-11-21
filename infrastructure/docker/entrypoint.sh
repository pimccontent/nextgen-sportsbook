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

echo "Starting NextGen API on :8080"
exec php artisan serve --host=0.0.0.0 --port=8080
