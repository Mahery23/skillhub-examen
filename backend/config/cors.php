<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://localhost:5173',   // Vite en développement local
        'http://127.0.0.1:5173',   // Vite en développement local
        'http://localhost',         // Frontend Docker (port 80)
        'http://localhost:80',      // Frontend Docker (port 80 explicite)
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,
];
