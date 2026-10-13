// Vitest global setup — ensure required env vars exist so modules that read
// `$app/env/private` at import time don't blow up.
process.env.DATABASE_URL ??= 'postgres://localhost/test';
