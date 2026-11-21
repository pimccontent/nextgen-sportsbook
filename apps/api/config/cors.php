<?php

$defaults = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
];

$fromEnv = array_values(array_filter(array_map(
    static fn (string $o): string => trim($o),
    explode(',', (string) env('CORS_ALLOWED_ORIGINS', ''))
)));

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => $fromEnv !== [] ? array_values(array_unique(array_merge($defaults, $fromEnv))) : $defaults,
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => ['X-NextGen-Api'],
    'max_age' => 0,
    'supports_credentials' => false,
];
