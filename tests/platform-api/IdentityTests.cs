using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using Caelora.Platform.Api.Accounts;
using Caelora.Platform.Api.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Npgsql;
using Xunit;
using Caelora.Platform.Api.Notifications;

namespace Caelora.Platform.Api.Tests;

public sealed class PostgresFactAttribute : FactAttribute
{
    public PostgresFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("CAELORA_TEST_POSTGRES")))
            Skip = "Real PostgreSQL required. Set CAELORA_TEST_POSTGRES to disposable test infrastructure; no InMemory substitute.";
    }
}

public sealed class CaptureMail : IIdentityMailSender
{
    public ConcurrentQueue<IdentityMail> Messages { get; } = new();
    public Task SendAsync(IdentityMail mail, CancellationToken cancellationToken) { Messages.Enqueue(mail); return Task.CompletedTask; }
    public ConfirmRequest Link(string email, bool reset = false)
    {
        var message = Messages.Last(item => item.Recipient == email && item.Subject.Contains(reset ? "Reset" : "Verify", StringComparison.Ordinal));
        var fragment = Regex.Match(message.Body, @"#userId=([0-9a-f-]+)&token=([^\s]+)");
        Assert.True(fragment.Success, "Expected a scoped account-action link in the test-only capture sink.");
        return new ConfirmRequest(Guid.Parse(fragment.Groups[1].Value), fragment.Groups[2].Value);
    }
}

public sealed class IdentityDatabase : IAsyncLifetime
{
    public string? Connection { get; private set; }
    private string? adminConnection;
    private readonly string name = "caelora_test_" + Guid.NewGuid().ToString("N");
    public string KeyDirectory { get; } = Path.Combine(Path.GetTempPath(), "CaeloraIdentityTests", Guid.NewGuid().ToString("N"));
    public async Task InitializeAsync()
    {
        var configured = Environment.GetEnvironmentVariable("CAELORA_TEST_POSTGRES");
        if (string.IsNullOrWhiteSpace(configured)) return;
        var builder = new NpgsqlConnectionStringBuilder(configured) { Database = "postgres", Timeout = 5 };
        adminConnection = builder.ConnectionString;
        await using var admin = new NpgsqlConnection(adminConnection);
        await admin.OpenAsync();
        // Identifier is generated internally, never supplied by a client or concatenated from configuration.
        await using (var create = new NpgsqlCommand("CREATE DATABASE \"" + name + "\"", admin)) await create.ExecuteNonQueryAsync();
        builder.Database = name;
        Connection = builder.ConnectionString;
        await using var db = new PlatformDbContext(new DbContextOptionsBuilder<PlatformDbContext>().UseNpgsql(Connection).Options);
        await db.Database.MigrateAsync();
    }
    public async Task DisposeAsync()
    {
        if (adminConnection is null) return;
        NpgsqlConnection.ClearAllPools();
        await using var admin = new NpgsqlConnection(adminConnection);
        await admin.OpenAsync();
        await using var drop = new NpgsqlCommand("DROP DATABASE IF EXISTS \"" + name + "\" WITH (FORCE)", admin);
        await drop.ExecuteNonQueryAsync();
        // Test key files may be retained in the OS temp directory; never recursively delete user paths.
    }
    public IdentityFactory Create(bool expiredTokens = false) => new(this, expiredTokens);
}

public sealed class IdentityFactory(IdentityDatabase database, bool expiredTokens = false) : WebApplicationFactory<Program>
{
    public CaptureMail Mail { get; } = new();
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Platform:PublicOrigin"] = "http://localhost:4321",
            ["Platform:CorsOrigins:0"] = "http://localhost:4200",
            ["Platform:PostgresEnabled"] = "true",
            ["Platform:PostgresConnection"] = database.Connection,
            ["Platform:RedisEnabled"] = "false",
            ["Accounts:Enabled"] = "true",
            ["Accounts:AccountOrigin"] = "http://localhost:4200",
            ["Accounts:EmailProvider"] = "Mailpit",
            ["Accounts:SmtpHost"] = "127.0.0.1",
            ["Accounts:SmtpPort"] = "1025",
            ["Accounts:SenderAddress"] = "accounts@caelora.test",
            ["Accounts:KeyDirectory"] = database.KeyDirectory,
            ["Delivery:WorkerEnabled"] = "false"
        }));
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IIdentityMailSender>(); services.AddSingleton<IIdentityMailSender>(Mail);
            if (expiredTokens) services.Configure<DataProtectionTokenProviderOptions>(options => options.TokenLifespan = TimeSpan.FromSeconds(-1));
        });
    }
    public HttpClient Client() => CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost"), AllowAutoRedirect = false });
    public async Task<ConfirmRequest> Link(string email, bool reset = false)
    {
        using var scope = Services.CreateScope();
        var processor = scope.ServiceProvider.GetRequiredService<OutboxProcessor>();
        for (var i = 0; i < 100 && await processor.ProcessOne(); i++) { }
        return Mail.Link(email, reset);
    }
}

public sealed class IdentityTests(IdentityDatabase database) : IClassFixture<IdentityDatabase>
{
    private const string Password = "Thornepeak-river-home-72";
    private static string Email() => "traveller-" + Guid.NewGuid().ToString("N") + "@caelora.test";
    private static async Task<HttpResponseMessage> Mutate(HttpClient client, string path, object body, HttpMethod? method = null)
    {
        var csrf = await client.GetFromJsonAsync<Csrf>("/api/v1/auth/csrf");
        using var request = new HttpRequestMessage(method ?? HttpMethod.Post, path) { Content = JsonContent.Create(body) };
        request.Headers.Add("Origin", "http://localhost:4200");
        request.Headers.Add("X-Caelora-CSRF", csrf!.Token);
        return await client.SendAsync(request);
    }
    private static async Task<string> RegisterAndConfirm(IdentityFactory factory, HttpClient client)
    {
        var email = Email();
        Assert.Equal(HttpStatusCode.Accepted, (await Mutate(client, "/api/v1/auth/register", new RegisterRequest(email, Password, "Thornepeak Traveller"))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Mutate(client, "/api/v1/auth/confirm-email", await factory.Link(email))).StatusCode);
        return email;
    }

    [PostgresFact]
    public async Task RegistrationPersistsFrameworkHashAndUniqueNormalizedEmail()
    {
        using var factory = database.Create(); var client = factory.Client(); var email = Email();
        var first = await Mutate(client, "/api/v1/auth/register", new RegisterRequest(email, Password, "River Walker"));
        var duplicate = await Mutate(client, "/api/v1/auth/register", new RegisterRequest(email.ToUpperInvariant(), Password, "Other Name"));
        Assert.Equal(HttpStatusCode.Accepted, first.StatusCode); Assert.Equal(first.StatusCode, duplicate.StatusCode);
        Assert.Equal(await first.Content.ReadAsStringAsync(), await duplicate.Content.ReadAsStringAsync());
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<PlatformDbContext>();
        var user = await db.Users.SingleAsync(item => item.NormalizedEmail == email.ToUpperInvariant());
        Assert.NotEqual(Password, user.PasswordHash); Assert.False(user.EmailConfirmed); Assert.Equal(user.Id.ToString("N"), user.UserName);
    }
    [PostgresFact]
    public async Task InvalidPasswordsAndNamesAreRejected()
    {
        using var factory = database.Create(); var client = factory.Client();
        Assert.Equal(HttpStatusCode.BadRequest, (await Mutate(client, "/api/v1/auth/register", new RegisterRequest(Email(), "short", "Traveller"))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Mutate(client, "/api/v1/auth/register", new RegisterRequest(Email(), "aaaaaaaaaaaa", "Traveller"))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Mutate(client, "/api/v1/auth/register", new RegisterRequest(Email(), Password, "\u0001bad"))).StatusCode);
    }
    [PostgresFact]
    public async Task EmailVerificationIsRequiredAndTheLinkIsSingleUse()
    {
        using var factory = database.Create(); var client = factory.Client(); var email = Email();
        await Mutate(client, "/api/v1/auth/register", new RegisterRequest(email, Password, "Traveller"));
        Assert.Equal(HttpStatusCode.Unauthorized, (await Mutate(client, "/api/v1/auth/login", new LoginRequest(email, Password))).StatusCode);
        var link = await factory.Link(email);
        Assert.Equal(HttpStatusCode.OK, (await Mutate(client, "/api/v1/auth/confirm-email", link)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Mutate(client, "/api/v1/auth/confirm-email", link)).StatusCode);
    }
    [PostgresFact]
    public async Task ConfirmationTokensExpire()
    {
        using var factory = database.Create(expiredTokens: true); var client = factory.Client(); var email = Email();
        await Mutate(client, "/api/v1/auth/register", new RegisterRequest(email, Password, "Traveller"));
        Assert.Equal(HttpStatusCode.BadRequest, (await Mutate(client, "/api/v1/auth/confirm-email", await factory.Link(email))).StatusCode);
    }
    [PostgresFact]
    public async Task LoginUsesSecureCookieAndProtectsProfileAcrossRequests()
    {
        using var factory = database.Create(); var client = factory.Client();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/me")).StatusCode);
        var email = await RegisterAndConfirm(factory, client);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Mutate(client, "/api/v1/auth/login", new LoginRequest(email, "Incorrect-password-000"))).StatusCode);
        var login = await Mutate(client, "/api/v1/auth/login", new LoginRequest(email, Password));
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var cookie = login.Headers.GetValues("Set-Cookie").Single(value => value.StartsWith("__Host-Caelora.Session=", StringComparison.Ordinal));
        Assert.Contains("httponly", cookie.ToLowerInvariant()); Assert.Contains("secure", cookie.ToLowerInvariant()); Assert.Contains("samesite=lax", cookie.ToLowerInvariant());
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/me")).StatusCode);
        var profile = await client.GetFromJsonAsync<AccountProfile>("/api/v1/me"); Assert.True(profile!.EmailVerified); Assert.Equal(email, profile.Email);
        Assert.Equal(HttpStatusCode.OK, (await Mutate(client, "/api/v1/me/profile", new ProfileRequest("Mountain Keeper"), HttpMethod.Put)).StatusCode);
        Assert.Equal("Mountain Keeper", (await client.GetFromJsonAsync<AccountProfile>("/api/v1/me"))!.DisplayName);
    }
    [PostgresFact]
    public async Task LogoutRevokesTheServerSessionIncludingReplayedCookies()
    {
        using var factory = database.Create(); var client = factory.Client(); var email = await RegisterAndConfirm(factory, client);
        var login = await Mutate(client, "/api/v1/auth/login", new LoginRequest(email, Password));
        var cookie = login.Headers.GetValues("Set-Cookie").Single(value => value.StartsWith("__Host-Caelora.Session=", StringComparison.Ordinal)).Split(';')[0];
        Assert.Equal(HttpStatusCode.NoContent, (await Mutate(client, "/api/v1/auth/logout", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/me")).StatusCode);
        using var replay = factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost"), HandleCookies = false });
        replay.DefaultRequestHeaders.Add("Cookie", cookie);
        Assert.Equal(HttpStatusCode.Unauthorized, (await replay.GetAsync("/api/v1/me")).StatusCode);
    }
    [PostgresFact]
    public async Task PasswordResetIsSingleUseAndRevokesExistingSessions()
    {
        using var factory = database.Create(); var client = factory.Client(); var email = await RegisterAndConfirm(factory, client);
        await Mutate(client, "/api/v1/auth/login", new LoginRequest(email, Password));
        Assert.Equal(HttpStatusCode.Accepted, (await Mutate(client, "/api/v1/auth/forgot-password", new EmailRequest(email))).StatusCode);
        var link = await factory.Link(email, reset: true); var replacement = "A-new-river-and-home-73";
        var reset = new ResetRequest(link.UserId, link.Token, replacement);
        Assert.Equal(HttpStatusCode.OK, (await Mutate(client, "/api/v1/auth/reset-password", reset)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/me")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Mutate(client, "/api/v1/auth/reset-password", reset)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Mutate(client, "/api/v1/auth/login", new LoginRequest(email, Password))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Mutate(client, "/api/v1/auth/login", new LoginRequest(email, replacement))).StatusCode);
    }
    [PostgresFact]
    public async Task CsrfAndUntrustedOriginsAreRejected()
    {
        using var factory = database.Create(); var client = factory.Client();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/register") { Content = JsonContent.Create(new RegisterRequest(Email(), Password, "Traveller")) };
        request.Headers.Add("Origin", "http://localhost:4200");
        Assert.Equal(HttpStatusCode.Forbidden, (await client.SendAsync(request)).StatusCode);
        var csrf = await client.GetFromJsonAsync<Csrf>("/api/v1/auth/csrf");
        using var cross = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/register") { Content = JsonContent.Create(new RegisterRequest(Email(), Password, "Traveller")) };
        cross.Headers.Add("Origin", "https://untrusted.example"); cross.Headers.Add("X-Caelora-CSRF", csrf!.Token);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.SendAsync(cross)).StatusCode);
    }
    [PostgresFact]
    public async Task AuthenticationRateLimitsActuallyRejectExcessRequests()
    {
        using var factory = database.Create(); var client = factory.Client();
        for (var i = 0; i < 10; i++) Assert.Equal(HttpStatusCode.Unauthorized, (await Mutate(client, "/api/v1/auth/login", new LoginRequest(Email(), Password))).StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, (await Mutate(client, "/api/v1/auth/login", new LoginRequest(Email(), Password))).StatusCode);
    }
    [PostgresFact]
    public async Task SecurityOverviewContainsOnlyTheAuthenticatedAccountsEvents()
    {
        using var factory = database.Create(); var client = factory.Client(); var email = await RegisterAndConfirm(factory, client);
        await Mutate(client, "/api/v1/auth/login", new LoginRequest(email, Password));
        using (var other = factory.Client())
        {
            var otherEmail = await RegisterAndConfirm(factory, other);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<PlatformDbContext>();
            var otherId = (await db.Users.SingleAsync(user => user.Email == otherEmail)).Id;
            db.SecurityEvents.Add(new SecurityEvent { Id = Guid.NewGuid(), UserId = otherId, Kind = "OtherAccountsPrivateActivity", OccurredAt = DateTimeOffset.UtcNow });
            await db.SaveChangesAsync();
        }
        var response = await client.GetAsync("/api/v1/me/security"); Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync(); Assert.Contains("BrowserSignedIn", body); Assert.DoesNotContain("OtherAccountsPrivateActivity", body); Assert.DoesNotContain("passwordHash", body); Assert.DoesNotContain("securityStamp", body);
    }
    [PostgresFact]
    public async Task FiveIncorrectPasswordsLockTheAccountEvenWithTheCorrectPassword()
    {
        using var factory = database.Create(); var client = factory.Client(); var email = await RegisterAndConfirm(factory, client);
        for (var i = 0; i < 5; i++)
            Assert.Equal(HttpStatusCode.Unauthorized, (await Mutate(client, "/api/v1/auth/login", new LoginRequest(email, "Incorrect-password-000"))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Mutate(client, "/api/v1/auth/login", new LoginRequest(email, Password))).StatusCode);
        using var scope = factory.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<PlatformUser>>();
        Assert.True(await users.IsLockedOutAsync((await users.FindByEmailAsync(email))!));
    }
    [PostgresFact]
    public async Task CookieSurvivesANewHostWithTheSameDatabaseAndPersistedKeys()
    {
        string cookie;
        using (var first = database.Create())
        {
            var client = first.Client(); var email = await RegisterAndConfirm(first, client);
            var response = await Mutate(client, "/api/v1/auth/login", new LoginRequest(email, Password));
            cookie = response.Headers.GetValues("Set-Cookie").Single(value => value.StartsWith("__Host-Caelora.Session=", StringComparison.Ordinal)).Split(';')[0];
        }
        using var restarted = database.Create();
        using var replay = restarted.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost"), HandleCookies = false });
        replay.DefaultRequestHeaders.Add("Cookie", cookie);
        Assert.Equal(HttpStatusCode.OK, (await replay.GetAsync("/api/v1/me")).StatusCode);
    }
    [PostgresFact]
    public async Task DevelopmentHttpCanIssueAndValidateAntiforgeryTokens()
    {
        using var factory = database.Create();
        using var local = factory.WithWebHostBuilder(builder => builder.UseEnvironment("Development"));
        using var client = local.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("http://localhost"), AllowAutoRedirect = false });
        Assert.Equal(HttpStatusCode.Accepted, (await Mutate(client, "/api/v1/auth/register", new RegisterRequest(Email(), Password, "Local Traveller"))).StatusCode);
    }
    [PostgresFact]
    public async Task EmailDeliveryFailureDoesNotUndoRegistrationAndAllowsLaterResend()
    {
        using var factory = database.Create();
        using var failing = factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        { services.RemoveAll<IIdentityMailSender>(); services.AddSingleton<IIdentityMailSender, FailingMail>(); }));
        using var client = failing.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
        var email = Email();
        Assert.Equal(HttpStatusCode.Accepted, (await Mutate(client, "/api/v1/auth/register", new RegisterRequest(email, Password, "Traveller"))).StatusCode);
        using (var scope = failing.Services.CreateScope()) { await scope.ServiceProvider.GetRequiredService<OutboxProcessor>().ProcessOne(); }
        using var healthy = database.Create(); var retry = healthy.Client();
        Assert.Equal(HttpStatusCode.Accepted, (await Mutate(retry, "/api/v1/auth/resend-verification", new EmailRequest(email))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Mutate(retry, "/api/v1/auth/confirm-email", await healthy.Link(email))).StatusCode);
    }
    private sealed class FailingMail : IIdentityMailSender
    {
        public Task SendAsync(IdentityMail mail, CancellationToken cancellationToken) => throw new IOException("Test SMTP failure");
    }
    private sealed record Csrf(string Token);
}
