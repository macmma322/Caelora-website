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

var builder = WebApplication.CreateBuilder(args);
// Local settings can never override environment variables or command-line values.
if (builder.Environment.IsDevelopment())
    builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true).AddJsonFile("appsettings.Identity.Local.json", optional: true).AddEnvironmentVariables().AddCommandLine(args);
builder.Services.AddAccounts(builder.Configuration, builder.Environment);
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
if (!app.Environment.IsDevelopment() && !app.Environment.IsEnvironment("Testing")) app.UseHsts();
app.Use(async (context, next) =>
{
    context.Response.Headers.XContentTypeOptions = "nosniff";
    context.Response.Headers.CacheControl = "no-store";
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
