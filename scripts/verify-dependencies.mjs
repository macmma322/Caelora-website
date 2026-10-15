// Opt-in smoke test. Targets must be explicitly configured disposable infrastructure.
import { spawn } from 'node:child_process';
const postgres = process.env.CAELORA_TEST_POSTGRES;
const redis = process.env.CAELORA_TEST_REDIS;
if (!postgres || !redis)
  throw new Error(
    'Set CAELORA_TEST_POSTGRES and CAELORA_TEST_REDIS to disposable test dependencies. No fallback is provided.',
  );
const port = 5189;
const environment = {
  ...process.env,
  ASPNETCORE_ENVIRONMENT: 'Testing',
  ASPNETCORE_URLS: `http://127.0.0.1:${port}`,
  Platform__PublicOrigin: 'http://localhost:4321',
  Platform__CorsOrigins__0: 'http://localhost:4200',
  Platform__PostgresEnabled: 'true',
  Platform__RedisEnabled: 'true',
  Platform__PostgresConnection: postgres,
  Platform__RedisConnection: redis,
};
const dll = 'services/platform-api/bin/Release/net10.0/Caelora.Platform.Api.dll';
function launch(args) {
  const child = spawn('dotnet', [dll, ...args], {
    env: environment,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // Drain logs without copying arbitrary provider error text into reports.
  child.stdout.resume();
  child.stderr.resume();
  return child;
}
const migration = launch(['--migrate']);
const migrationExit = await new Promise((resolve, reject) => {
  migration.once('error', reject);
  migration.once('exit', resolve);
});
if (migrationExit !== 0)
  throw new Error(
    'Dependency migration failed. Inspect disposable dependency availability and configuration.',
  );
const server = launch([]);
try {
  let ready;
  for (let attempt = 0; attempt < 30; attempt++) {
    if (server.exitCode !== null) throw new Error('Temporary API exited before readiness.');
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health/ready`, {
        signal: AbortSignal.timeout(6000),
      });
      ready = await response.json();
      if (
        response.ok &&
        ready.checks.length === 2 &&
        ready.checks.every((check) => check.enabled && check.status === 'Healthy')
      )
        break;
    } catch {
      /* Startup/dependency retry; final assertion is mandatory. */
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (
    !ready ||
    ready.status !== 'Healthy' ||
    ready.checks.length !== 2 ||
    !ready.checks.every((check) => check.enabled && check.status === 'Healthy')
  )
    throw new Error('Configured dependencies never became healthy.');
  console.log(
    'PASS: EF migration applied; API readiness verified PostgreSQL connectivity/migration state and Redis PING.',
  );
} finally {
  server.kill();
}
