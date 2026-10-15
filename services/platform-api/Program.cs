using System.Diagnostics;
using System.Threading.RateLimiting;
using Caelora.Platform.Api.Application;
using Caelora.Platform.Api.Configuration;
using Caelora.Platform.Api.Infrastructure;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using Caelora.Platform.Api.Accounts;
using Caelora.Platform.Api.Notifications;

var builder = WebApplication.CreateBuilder(args);
// Local settings can never override environment variables or command-line values.
if (builder.Environment.IsDevelopment())
    builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true).AddJsonFile("appsettings.Identity.Local.json", optional: true).AddEnvironmentVariables().AddCommandLine(args);
builder.Services.AddAccounts(builder.Configuration, builder.Environment);
builder.Services.AddSingleton<IValidateOptions<TransportOptions>, TransportOptionsValidator>();
builder.Services.AddOptions<TransportOptions>().BindConfiguration("Transport").ValidateOnStart();
builder.Services.AddSingleton<IConfigureOptions<Microsoft.AspNetCore.Builder.ForwardedHeadersOptions>, ForwardingConfiguration>();
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 16 * 1024);
builder.Logging.ClearProviders();
builder.Logging.AddJsonConsole(x => x.IncludeScopes = true);
builder.Services.AddSingleton<IValidateOptions<PlatformOptions>, PlatformOptionsValidator>();
builder.Services.AddOptions<PlatformOptions>().BindConfiguration(PlatformOptions.Section).ValidateOnStart();
builder.Services.AddProblemDetails(options => options.CustomizeProblemDetails = context =>
{
    context.ProblemDetails.Extensions["traceId"] = Activity.Current?.Id ?? context.HttpContext.TraceIdentifier;
});
builder.Services.AddExceptionHandler<FoundationExceptionHandler>();
builder.Services.AddOpenApi("v1");
builder.Services.AddSingleton<IPlatformInformation, PlatformInformation>();
builder.Services.AddCors(options => options.AddPolicy("portals", policy =>
    policy.WithOrigins(builder.Configuration.GetSection("Platform:CorsOrigins").Get<string[]>() ?? [])
        .WithMethods("GET").WithHeaders("Accept", "Content-Type")));
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("auth", context => RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = 120, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
});
builder.Services.AddDbContext<PlatformDbContext>((services, options) =>
{
    var config = services.GetRequiredService<IOptions<PlatformOptions>>().Value;
    if (config.PostgresEnabled) options.UseNpgsql(config.PostgresConnection, npgsql => npgsql.CommandTimeout(3));
});
builder.Services.AddSingleton<RedisConnection>();
builder.Services.AddHealthChecks()
    .AddCheck<PostgresReadiness>("postgres", tags: ["ready"], timeout: TimeSpan.FromSeconds(5))
    .AddCheck<RedisReadiness>("redis", tags: ["ready"], timeout: TimeSpan.FromSeconds(5));
var app = builder.Build();
if (args.Contains("--outbox-status", StringComparer.Ordinal) || args.Any(x => x.StartsWith("--outbox-retry=", StringComparison.Ordinal)))
{
    if (!app.Services.GetRequiredService<IOptions<AccountsOptions>>().Value.Enabled) throw new InvalidOperationException("Enable Accounts before operating on the outbox.");
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<PlatformDbContext>();
    var retry = args.SingleOrDefault(x => x.StartsWith("--outbox-retry=", StringComparison.Ordinal));
    if (retry is not null)
    {
        if (!Guid.TryParse(retry.Split('=')[1], out var id)) throw new ArgumentException("Supply an explicit outbox message UUID.");
        Console.WriteLine("Retried records: " + await scope.ServiceProvider.GetRequiredService<OutboxProcessor>().Retry(id, CancellationToken.None));
    }
    Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(await db.OutboxMessages.GroupBy(x => new { x.State, x.LastFailure }).Select(group => new { group.Key.State, group.Key.LastFailure, Count = group.Count() }).ToListAsync()));
    Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(await db.OutboxMessages.Where(x => x.State == "Dead" || x.State == "Retry").OrderBy(x => x.CreatedAt).Take(20)
        .Select(x => new { x.Id, x.Type, x.State, x.Attempts, x.NextAttemptAt, x.ExpiresAt, x.LastFailure }).ToListAsync()));
    return;
}
// Explicit operator command, never automatic migration at request startup.
if (args.Contains("--migrate", StringComparer.Ordinal))
{
    var options = app.Services.GetRequiredService<IOptions<PlatformOptions>>().Value;
    if (!options.PostgresEnabled) throw new InvalidOperationException("Enable Platform:PostgresEnabled before applying migrations.");
    using var scope = app.Services.CreateScope();
    await scope.ServiceProvider.GetRequiredService<PlatformDbContext>().Database.MigrateAsync();
    return;
}
app.UseExceptionHandler();
// Empty trusted-proxy lists must NEVER activate middleware (empty framework lists mean trust all).
var transport = app.Services.GetRequiredService<IOptions<TransportOptions>>().Value;
if (transport.TrustedProxies.Length > 0) app.UseForwardedHeaders();
if (!app.Environment.IsDevelopment() && !app.Environment.IsEnvironment("Testing")) app.UseHsts();
app.Use(async (context, next) =>
{
    context.Response.Headers.XContentTypeOptions = "nosniff";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers.ContentSecurityPolicy = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'";
    context.Response.Headers.CacheControl = "no-store";
    if ((transport.RequireHttps || (!app.Environment.IsDevelopment() && !app.Environment.IsEnvironment("Testing"))) && !context.Request.IsHttps && !context.Request.Path.StartsWithSegments("/health"))
    { context.Response.StatusCode = 400; await context.Response.WriteAsJsonAsync(new { title = "HTTPS is required." }); return; }
    await next(context);
});
app.UseStatusCodePages();
app.UseCors("portals");
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.MapAccounts();
app.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false, ResponseWriter = WriteHealth }).DisableRateLimiting();
app.MapHealthChecks("/health/ready", new HealthCheckOptions { Predicate = check => check.Tags.Contains("ready"), ResponseWriter = WriteHealth }).DisableRateLimiting();
app.MapGet("/api/v1/platform", (IPlatformInformation information) => information.Read())
    .WithName("GetPlatformInformationV1").WithSummary("Foundation capability information. No account or ownership state.");
if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Testing")) app.MapOpenApi();
await app.RunAsync();

static Task WriteHealth(HttpContext context, HealthReport report) => context.Response.WriteAsJsonAsync(new
{
    status = report.Status.ToString(),
    // No exception messages, endpoints or credentials in public health responses.
    checks = report.Entries.Select(pair => new { name = pair.Key, status = pair.Value.Status.ToString(), enabled = !pair.Value.Data.ContainsKey("disabled") })
});

public partial class Program;

public sealed class FoundationExceptionHandler(IProblemDetailsService problems, ILogger<FoundationExceptionHandler> logger)
    : Microsoft.AspNetCore.Diagnostics.IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken cancellationToken)
    {
        // Log a type and trace ID, never arbitrary exception text that might contain connection data.
        logger.LogError("Unhandled {ExceptionType}; trace {TraceId}", exception.GetType().Name, context.TraceIdentifier);
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        return await problems.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            ProblemDetails = new() { Status = 500, Title = "An unexpected platform error occurred." }
        });
    }
}
