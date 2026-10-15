using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Caelora.Platform.Api.Accounts;
using Caelora.Platform.Api.Infrastructure;
using Caelora.Platform.Api.Notifications;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using OtpNet;
using Xunit;

namespace Caelora.Platform.Api.Tests;

public sealed class M3SecurityTests(IdentityDatabase database) : IClassFixture<IdentityDatabase>
{
    private const string Password = "Thornepeak-river-home-72";
    private static async Task<HttpResponseMessage> Post(HttpClient client, string path, object body)
    {
        var csrf = (await client.GetFromJsonAsync<JsonObject>("/api/v1/auth/csrf"))!["token"]!.GetValue<string>();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/" + path) { Content = JsonContent.Create(body) };
        request.Headers.Add("Origin", "http://localhost:4200"); request.Headers.Add("X-Caelora-CSRF", csrf);
        return await client.SendAsync(request);
    }
    private static async Task<JsonObject> Json(HttpResponseMessage response) => (await response.Content.ReadFromJsonAsync<JsonObject>())!;
    private static async Task<string> User(IdentityFactory factory, HttpClient client)
    {
        var email = "m3-" + Guid.NewGuid().ToString("N") + "@caelora.test";
        Assert.Equal(HttpStatusCode.Accepted, (await Post(client, "auth/register", new RegisterRequest(email, Password, "M3 Traveller"))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Post(client, "auth/confirm-email", await factory.Link(email))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Post(client, "auth/login", new LoginRequest(email, Password))).StatusCode);
        return email;
    }
    private static string Code(string secret, int step = 0) => new Totp(Base32Encoding.ToBytes(secret)).ComputeTotp(DateTime.UtcNow.AddSeconds(step * 30));
    private static async Task<(string Secret, string[] Recovery)> Enable(IdentityFactory factory, HttpClient client)
    {
        var enrollment = await Post(client, "me/mfa/enrollment", new { }); Assert.Equal(HttpStatusCode.OK, enrollment.StatusCode);
        var setup = await Json(enrollment); var secret = setup["secret"]!.GetValue<string>(); Assert.StartsWith("otpauth://totp/", setup["provisioningUri"]!.GetValue<string>());
        var activate = await Post(client, "me/mfa/activate", new CodeRequest(Code(secret))); Assert.Equal(HttpStatusCode.OK, activate.StatusCode);
        var result = await Json(activate); return (secret, result["recoveryCodes"]!.AsArray().Select(x => x!.GetValue<string>()).ToArray());
    }
    private static async Task<string> Challenge(HttpClient client, string email)
    {
        var response = await Post(client, "auth/login", new LoginRequest(email, Password)); Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.False(response.Headers.Contains("Set-Cookie") && response.Headers.GetValues("Set-Cookie").Any(x => x.StartsWith("__Host-Caelora.Session=", StringComparison.Ordinal) && !x.Contains("expires=Thu, 01 Jan 1970", StringComparison.OrdinalIgnoreCase)));
        return (await Json(response))["challenge"]!.GetValue<string>();
    }
    [PostgresFact]
    public async Task EnrollmentRequiresRecentProofAndActivationRequiresValidCode()
    {
        using var factory = database.Create(); using var client = factory.Client(); await User(factory, client);
        using (var scope = factory.Services.CreateScope())
            await scope.ServiceProvider.GetRequiredService<PlatformDbContext>().BrowserSessions.ExecuteUpdateAsync(update => update.SetProperty(x => x.ReauthenticatedAt, DateTimeOffset.UtcNow.AddMinutes(-6)));
        Assert.Equal(HttpStatusCode.Forbidden, (await Post(client, "me/mfa/enrollment", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Post(client, "me/reauthenticate", new ReauthenticationRequest(Password))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Post(client, "me/mfa/enrollment", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Post(client, "me/mfa/activate", new CodeRequest("bad"))).StatusCode);
        Assert.False((await client.GetFromJsonAsync<JsonObject>("/api/v1/me/mfa"))!["enabled"]!.GetValue<bool>());
    }
    [PostgresFact]
    public async Task MfaCannotBeBypassedAndSecretsAreEncryptedAtRest()
    {
        using var factory = database.Create(); using var client = factory.Client(); var email = await User(factory, client);
        var (secret, codes) = await Enable(factory, client); Assert.Equal(10, codes.Length);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/me")).StatusCode);
        var challenge = await Challenge(client, email);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Post(client, "auth/mfa", new MfaChallengeRequest(challenge, "invalid"))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Post(client, "auth/mfa", new MfaChallengeRequest(challenge, Code(secret, 1)))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Post(client, "auth/mfa", new MfaChallengeRequest(challenge, Code(secret, 2)))).StatusCode);
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<PlatformDbContext>();
        var uid = (await db.Users.SingleAsync(x => x.Email == email)).Id;
        var values = await db.UserTokens.Where(x => x.UserId == uid).Select(x => x.Value).ToListAsync();
        Assert.All(values, value => { Assert.StartsWith("dp1:", value); Assert.DoesNotContain(secret, value); Assert.DoesNotContain(codes[0], value); });
        var status = await client.GetStringAsync("/api/v1/me/mfa"); Assert.DoesNotContain(secret, status);
        Assert.Equal(HttpStatusCode.Conflict, (await Post(client, "me/mfa/enrollment", new { })).StatusCode);
    }
    [PostgresFact]
    public async Task AuthenticatorReplayAcrossChallengesIsRejected()
    {
        using var factory = database.Create(); using var client = factory.Client(); var email = await User(factory, client); var (secret, _) = await Enable(factory, client);
        var challenge = await Challenge(client, email);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Post(client, "auth/mfa", new MfaChallengeRequest(challenge, Code(secret)))).StatusCode); // activation already consumed it
        Assert.Equal(HttpStatusCode.OK, (await Post(client, "auth/mfa", new MfaChallengeRequest(challenge, Code(secret, 1)))).StatusCode);
        using var other = factory.Client(); var second = await Challenge(other, email);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Post(other, "auth/mfa", new MfaChallengeRequest(second, Code(secret, 1)))).StatusCode);
    }
    [PostgresFact]
    public async Task RecoveryCodesAreOneUseAndRegenerationInvalidatesOldCodesAndSessions()
    {
        using var factory = database.Create(); using var client = factory.Client(); var email = await User(factory, client); var (_, codes) = await Enable(factory, client);
        var challenge = await Challenge(client, email);
        Assert.Equal(HttpStatusCode.OK, (await Post(client, "auth/mfa", new MfaChallengeRequest(challenge, codes[0], true))).StatusCode);
        using var other = factory.Client(); var second = await Challenge(other, email);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Post(other, "auth/mfa", new MfaChallengeRequest(second, codes[0], true))).StatusCode);
        var regenerate = await Post(client, "me/mfa/recovery-codes", new { }); Assert.Equal(HttpStatusCode.OK, regenerate.StatusCode);
        var replacement = (await Json(regenerate))["recoveryCodes"]!.AsArray()[0]!.GetValue<string>();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/me")).StatusCode);
        // New security stamp invalidates outstanding challenges too.
        using var restarted = database.Create();
        using var replay = restarted.Client();
        Assert.Equal(HttpStatusCode.Unauthorized, (await Post(replay, "auth/mfa", new MfaChallengeRequest(second, codes[1], true))).StatusCode);
        using var fresh = restarted.Client(); var freshChallenge = await Challenge(fresh, email);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Post(fresh, "auth/mfa", new MfaChallengeRequest(freshChallenge, codes[1], true))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Post(fresh, "auth/mfa", new MfaChallengeRequest(freshChallenge, replacement, true))).StatusCode);
    }
    [PostgresFact]
    public async Task MfaDisableEndsAllSessionsAndRemovesTheChallengeRequirement()
    {
        using var factory = database.Create(); using var client = factory.Client(); var email = await User(factory, client); var (_, codes) = await Enable(factory, client);
        var challenge = await Challenge(client, email); await Post(client, "auth/mfa", new MfaChallengeRequest(challenge, codes[0], true));
        Assert.Equal(HttpStatusCode.OK, (await Post(client, "me/mfa/disable", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/me")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Post(client, "auth/login", new LoginRequest(email, Password))).StatusCode);
    }
    [PostgresFact]
    public async Task RemoteRevocationAndEverywhereRejectReplayedCookies()
    {
        using var factory = database.Create(); using var first = factory.Client(); var email = await User(factory, first);
        using var second = factory.Client(); await Post(second, "auth/login", new LoginRequest(email, Password));
        var overview = (await first.GetFromJsonAsync<JsonObject>("/api/v1/me/security"))!;
        var sessions = overview["sessions"]!.AsArray(); Assert.Equal(2, sessions.Count); Assert.Single(sessions, x => x!["isCurrent"]!.GetValue<bool>());
        var other = sessions.Single(x => !x!["isCurrent"]!.GetValue<bool>())!["id"]!.GetValue<Guid>();
        Assert.Equal(HttpStatusCode.OK, (await Post(first, "me/sessions/revoke", new SessionRevokeRequest("selected", other))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await second.GetAsync("/api/v1/me")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Post(first, "me/sessions/revoke", new SessionRevokeRequest("everywhere"))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await first.GetAsync("/api/v1/me")).StatusCode);
    }
    [PostgresFact]
    public async Task AnotherAccountsSessionCannotBeRevokedAndExpiredSessionsFail()
    {
        using var factory = database.Create(); using var first = factory.Client(); await User(factory, first);
        using var other = factory.Client(); await User(factory, other);
        var session = (await other.GetFromJsonAsync<JsonObject>("/api/v1/me/security"))!["sessions"]!.AsArray()[0]!["id"]!.GetValue<Guid>();
        Assert.Equal(HttpStatusCode.NotFound, (await Post(first, "me/sessions/revoke", new SessionRevokeRequest("selected", session))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await other.GetAsync("/api/v1/me")).StatusCode);
        using var scope = factory.Services.CreateScope(); await scope.ServiceProvider.GetRequiredService<PlatformDbContext>().BrowserSessions.Where(x => x.Id == session).ExecuteUpdateAsync(update => update.SetProperty(x => x.ExpiresAt, DateTimeOffset.UtcNow.AddSeconds(-1)));
        Assert.Equal(HttpStatusCode.Unauthorized, (await other.GetAsync("/api/v1/me")).StatusCode);
    }
    [PostgresFact]
    public async Task NotificationHistoryIsPersistedPaginatedAndIsolated()
    {
        using var factory = database.Create(); using var client = factory.Client(); var email = await User(factory, client);
        Guid otherNotification;
        using (var other = factory.Client())
        {
            await User(factory, other); otherNotification = (await other.GetFromJsonAsync<JsonObject>("/api/v1/me/notifications"))!["items"]!.AsArray()[0]!["id"]!.GetValue<Guid>();
        }
        Assert.Equal(HttpStatusCode.NotFound, (await Post(client, "me/notifications/read", new NotificationReadRequest(otherNotification))).StatusCode);
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<PlatformDbContext>(); var user = await db.Users.SingleAsync(x => x.Email == email);
            for (var i = 0; i < 23; i++) scope.ServiceProvider.GetRequiredService<NotificationWriter>().Security(user, "RecoveryCodesRegenerated");
            await db.SaveChangesAsync();
        }
        var page = (await client.GetFromJsonAsync<JsonObject>("/api/v1/me/notifications"))!; Assert.Equal(20, page["items"]!.AsArray().Count); Assert.Equal(24, page["unread"]!.GetValue<int>());
        var last = (await client.GetFromJsonAsync<JsonObject>("/api/v1/me/notifications?page=2"))!; Assert.Equal(4, last["items"]!.AsArray().Count);
        var id = page["items"]!.AsArray()[0]!["id"]!.GetValue<Guid>();
        Assert.Equal(23, (await Json(await Post(client, "me/notifications/read", new NotificationReadRequest(id))))["unread"]!.GetValue<int>());
        Assert.Equal(0, (await Json(await Post(client, "me/notifications/read", new NotificationReadRequest(All: true))))["unread"]!.GetValue<int>());
    }
    [PostgresFact]
    public async Task KeyRotationRetainsDecryptionOfPreviouslyIssuedData()
    {
        string value;
        using (var factory = database.Create())
        {
            value = factory.Services.GetRequiredService<IDataProtectionProvider>().CreateProtector("rotation-test").Protect("test-only-state");
            factory.Services.GetRequiredService<Microsoft.AspNetCore.DataProtection.KeyManagement.IKeyManager>().CreateNewKey(DateTimeOffset.UtcNow.AddSeconds(-1), DateTimeOffset.UtcNow.AddDays(90));
        }
        using var restarted = database.Create();
        Assert.Equal("test-only-state", restarted.Services.GetRequiredService<IDataProtectionProvider>().CreateProtector("rotation-test").Unprotect(value));
    }
}
