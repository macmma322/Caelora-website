using System.Security.Claims;
using Caelora.Platform.Api.Infrastructure;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Caelora.Platform.Api.Accounts;

public sealed class SessionCookieEvents(PlatformDbContext database, UserManager<PlatformUser> users, IOptions<IdentityOptions> identity, TimeProvider clock) : CookieAuthenticationEvents
{
    public const string SessionClaim = "caelora:browser-session";
    public override async Task ValidatePrincipal(CookieValidatePrincipalContext context)
    {
        var principal = context.Principal;
        if (principal is null || !Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var userId) || !Guid.TryParse(principal.FindFirstValue(SessionClaim), out var sessionId))
        { await Reject(context); return; }
        var session = await database.BrowserSessions.AsNoTracking().Include(item => item.User).SingleOrDefaultAsync(item => item.Id == sessionId && item.UserId == userId, context.HttpContext.RequestAborted);
        if (session is null || session.RevokedAt is not null || session.ExpiresAt <= clock.GetUtcNow() || !session.User.EmailConfirmed || (session.User.TwoFactorEnabled && !session.MfaAuthenticated) ||
            principal.FindFirstValue(identity.Value.ClaimsIdentity.SecurityStampClaimType) != await users.GetSecurityStampAsync(session.User))
        { await Reject(context); return; }
        var now = clock.GetUtcNow();
        if (session.LastSeenAt < now.AddMinutes(-5))
            await database.BrowserSessions.Where(x => x.Id == sessionId && x.LastSeenAt < now.AddMinutes(-5))
                .ExecuteUpdateAsync(update => update.SetProperty(x => x.LastSeenAt, now), context.HttpContext.RequestAborted);
    }
    private static async Task Reject(CookieValidatePrincipalContext context)
    {
        context.RejectPrincipal();
        await context.HttpContext.SignOutAsync(IdentityConstants.ApplicationScheme);
    }
    public override Task RedirectToLogin(RedirectContext<CookieAuthenticationOptions> context) { context.Response.StatusCode = 401; return Task.CompletedTask; }
    public override Task RedirectToAccessDenied(RedirectContext<CookieAuthenticationOptions> context) { context.Response.StatusCode = 403; return Task.CompletedTask; }
}
