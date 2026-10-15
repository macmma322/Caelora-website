using System.Security.Claims;
using Caelora.Platform.Api.Infrastructure;
using Caelora.Platform.Api.Notifications;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Caelora.Platform.Api.Accounts;

public sealed class SessionIssuer(PlatformDbContext db, SignInManager<PlatformUser> signIn, NotificationWriter notifications, IOptions<AccountsOptions> options, TimeProvider clock)
{
    public async Task<IResult> Issue(PlatformUser user, HttpContext context, CancellationToken token, bool mfaVerified = false)
    {
        var now = clock.GetUtcNow(); var descriptor = Describe(context.Request.Headers.UserAgent.ToString());
        var significant = !await db.BrowserSessions.AnyAsync(x => x.UserId == user.Id && x.Descriptor == descriptor, token);
        var session = new BrowserSession
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            CreatedAt = now,
            LastSeenAt = now,
            ReauthenticatedAt = now,
            Descriptor = descriptor,
            MfaAuthenticated = mfaVerified,
            ExpiresAt = now.AddHours(options.Value.SessionHours)
        };
        if (Guid.TryParse(context.User.FindFirstValue(SessionCookieEvents.SessionClaim), out var previous))
        {
            var previousUser = MfaOperations.UserId(context);
            await db.BrowserSessions.Where(x => x.Id == previous && x.UserId == previousUser).ExecuteUpdateAsync(update => update.SetProperty(x => x.RevokedAt, now), token);
        }
        db.BrowserSessions.Add(session);
        notifications.Security(user, "BrowserSignedIn");
        if (significant) notifications.Enqueue(user, "SecurityActivity", "new-session:" + session.Id);
        await db.SaveChangesAsync(token);
        var principal = await signIn.CreateUserPrincipalAsync(user);
        principal.AddIdentity(new ClaimsIdentity([new Claim(SessionCookieEvents.SessionClaim, session.Id.ToString())]));
        await context.SignInAsync(IdentityConstants.ApplicationScheme, principal, new AuthenticationProperties { IsPersistent = true, IssuedUtc = now, ExpiresUtc = session.ExpiresAt, AllowRefresh = false });
        return Results.Ok(new AccountProfile(user.Id, user.Email!, user.EmailConfirmed, user.DisplayName, user.CreatedAt));
    }
    public async Task Refresh(PlatformUser user, HttpContext context, CancellationToken token)
    {
        var id = MfaOperations.SessionId(context);
        var session = await db.BrowserSessions.SingleAsync(x => x.Id == id && x.UserId == user.Id, token);
        var principal = await signIn.CreateUserPrincipalAsync(user);
        principal.AddIdentity(new ClaimsIdentity([new Claim(SessionCookieEvents.SessionClaim, id.ToString())]));
        await context.SignInAsync(IdentityConstants.ApplicationScheme, principal, new AuthenticationProperties { IsPersistent = true, IssuedUtc = session.CreatedAt, ExpiresUtc = session.ExpiresAt, AllowRefresh = false });
    }
    public static string Describe(string agent)
    {
        var platform = agent.Contains("Android", StringComparison.OrdinalIgnoreCase) ? "Android" : agent.Contains("iPhone", StringComparison.OrdinalIgnoreCase) || agent.Contains("iPad", StringComparison.OrdinalIgnoreCase) ? "iOS" : agent.Contains("Windows", StringComparison.OrdinalIgnoreCase) ? "Windows" : agent.Contains("Macintosh", StringComparison.OrdinalIgnoreCase) ? "macOS" : agent.Contains("Linux", StringComparison.OrdinalIgnoreCase) ? "Linux" : "Unknown platform";
        var browser = agent.Contains("Edg/", StringComparison.Ordinal) ? "Edge" : agent.Contains("Firefox/", StringComparison.Ordinal) ? "Firefox" : agent.Contains("Chrome/", StringComparison.Ordinal) ? "Chromium" : agent.Contains("Safari/", StringComparison.Ordinal) ? "Safari" : "Browser";
        return platform + " · " + browser; // Coarse, untrusted display hint only; raw user-agent never persisted.
    }
}
