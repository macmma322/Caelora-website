using Caelora.Platform.Api.Infrastructure;
using Caelora.Platform.Api.Notifications;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Caelora.Platform.Api.Accounts;

public sealed record SessionRevokeRequest(string Scope, Guid? SessionId = null);
public sealed record NotificationReadRequest(Guid? NotificationId = null, bool All = false);

public sealed class AccountSecurityOperations(PlatformDbContext db, MfaOperations mfa, NotificationWriter writer, TimeProvider clock)
{
    public async Task<IResult> Revoke(SessionRevokeRequest request, HttpContext context, CancellationToken token)
    {
        if (request.Scope is not ("selected" or "others" or "everywhere")) return Results.BadRequest();
        await using var transaction = await db.Database.BeginTransactionAsync(token);
        var uid = MfaOperations.UserId(context); var sid = MfaOperations.SessionId(context); var now = clock.GetUtcNow();
        var user = await mfa.LockUser(uid, token);
        if (user is null || !await mfa.Recent(context, token)) return MfaOperations.StepUp();
        var query = db.BrowserSessions.Where(x => x.UserId == uid && x.RevokedAt == null && x.ExpiresAt > now);
        if (request.Scope == "selected") query = query.Where(x => x.Id == request.SessionId);
        if (request.Scope == "others") query = query.Where(x => x.Id != sid);
        var endsCurrent = request.Scope == "everywhere" || request.Scope == "selected" && request.SessionId == sid;
        var count = await query.ExecuteUpdateAsync(update => update.SetProperty(x => x.RevokedAt, now), token);
        if (request.Scope == "selected" && count == 0) return Results.NotFound();
        if (count > 0) writer.Security(user, "SessionsRevoked");
        await db.SaveChangesAsync(token); await transaction.CommitAsync(token);
        if (endsCurrent) await context.SignOutAsync(IdentityConstants.ApplicationScheme);
        return Results.Ok(new { revoked = count, signedOut = endsCurrent, message = $"Ended {count} browser session(s)." });
    }
    public async Task<IResult> Notifications(HttpContext context, int page, CancellationToken token)
    {
        if (page is < 1 or > 10000) return Results.BadRequest();
        var uid = MfaOperations.UserId(context); var query = db.Notifications.AsNoTracking().Where(x => x.UserId == uid);
        var total = await query.CountAsync(token); var unread = await query.CountAsync(x => x.ReadAt == null, token);
        var items = await query.OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id).Skip((page - 1) * 20).Take(20)
            .Select(x => new { x.Id, x.Category, x.Severity, x.Title, x.Summary, x.CreatedAt, x.ReadAt }).ToListAsync(token);
        return Results.Ok(new { items, total, unread, page, pageSize = 20 });
    }
    public async Task<IResult> Read(NotificationReadRequest request, HttpContext context, CancellationToken token)
    {
        var uid = MfaOperations.UserId(context); var query = db.Notifications.Where(x => x.UserId == uid);
        if (!request.All)
        {
            if (request.NotificationId is null || !await query.AnyAsync(x => x.Id == request.NotificationId, token)) return Results.NotFound();
            query = query.Where(x => x.Id == request.NotificationId);
        }
        await query.Where(x => x.ReadAt == null).ExecuteUpdateAsync(update => update.SetProperty(x => x.ReadAt, clock.GetUtcNow()), token);
        return Results.Ok(new { unread = await db.Notifications.CountAsync(x => x.UserId == uid && x.ReadAt == null, token) });
    }
}
