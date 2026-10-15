using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using Caelora.Platform.Api.Configuration;
using StackExchange.Redis;

namespace Caelora.Platform.Api.Infrastructure;

public sealed class RedisConnection(IOptions<PlatformOptions> options) : IAsyncDisposable
{
    private readonly Lazy<Task<ConnectionMultiplexer>> connection = new(() =>
    {
        var config = ConfigurationOptions.Parse(options.Value.RedisConnection);
        config.AbortOnConnectFail = false;
        config.ConnectTimeout = 2000;
        config.AsyncTimeout = 2000;
        return ConnectionMultiplexer.ConnectAsync(config);
    });
    public async Task PingAsync(CancellationToken token) => await (await connection.Value.WaitAsync(token)).GetDatabase().PingAsync().WaitAsync(token);
    public async ValueTask DisposeAsync()
    {
        if (connection.IsValueCreated && connection.Value.IsCompletedSuccessfully)
            await (await connection.Value).DisposeAsync();
    }
}

public sealed class PostgresReadiness(IServiceScopeFactory scopeFactory, IOptions<PlatformOptions> options) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken)
    {
        if (!options.Value.PostgresEnabled) return HealthCheckResult.Healthy(data: new Dictionary<string, object> { ["disabled"] = true });
        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<PlatformDbContext>();
            if (!await db.Database.CanConnectAsync(cancellationToken)) return HealthCheckResult.Unhealthy("PostgreSQL unavailable.");
            if ((await db.Database.GetPendingMigrationsAsync(cancellationToken)).Any())
                return HealthCheckResult.Unhealthy("PostgreSQL has pending migrations.");
            return HealthCheckResult.Healthy();
        }
        catch (Exception) when (!cancellationToken.IsCancellationRequested) { return HealthCheckResult.Unhealthy("PostgreSQL unavailable."); }
    }
}

public sealed class RedisReadiness(RedisConnection connection, IOptions<PlatformOptions> options) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken)
    {
        if (!options.Value.RedisEnabled) return HealthCheckResult.Healthy(data: new Dictionary<string, object> { ["disabled"] = true });
        try { await connection.PingAsync(cancellationToken); return HealthCheckResult.Healthy(); }
        catch (Exception) when (!cancellationToken.IsCancellationRequested) { return HealthCheckResult.Unhealthy("Redis unavailable."); }
    }
}
