using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Caelora.Platform.Api.Infrastructure;
using Caelora.Platform.Api.Notifications;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;

namespace Caelora.Platform.Api.Accounts;

public sealed class MfaOperations(PlatformDbContext db, UserManager<PlatformUser> users, SignInManager<PlatformUser> signIn, SessionIssuer issuer, NotificationWriter notifications, TimeProvider clock)
{
    public async Task<IResult> BeginChallenge(PlatformUser user, HttpContext context, CancellationToken token)
    {
        var secret = WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32)); var id = Guid.NewGuid();
        db.MfaChallenges.Add(new MfaChallenge { Id = id, UserId = user.Id, SecretHash = Hash(secret), StampHash = Hash(user.SecurityStamp!), ExpiresAt = clock.GetUtcNow().AddMinutes(5) });
        await db.SaveChangesAsync(token);
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var previous = SessionId(context); var previousUser = UserId(context);
            await db.BrowserSessions.Where(x => x.Id == previous && x.UserId == previousUser).ExecuteUpdateAsync(update => update.SetProperty(x => x.RevokedAt, clock.GetUtcNow()), token);
            await context.SignOutAsync(IdentityConstants.ApplicationScheme);
        }
        return Results.Accepted(value: new { mfaRequired = true, challenge = id.ToString("N") + "." + secret });
    }
    public async Task<IResult> Complete(MfaChallengeRequest request, HttpContext context, CancellationToken token)
    {
        var parts = (request.Challenge ?? "").Split('.');
        if (parts.Length != 2 || parts[1].Length > 100 || !Guid.TryParseExact(parts[0], "N", out var id)) return Rejected();
        await using var transaction = await db.Database.BeginTransactionAsync(token);
        var challenge = await db.MfaChallenges.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, token);
        if (challenge is null || challenge.SecretHash != Hash(parts[1])) return Rejected();
        var user = await LockUser(challenge.UserId, token);
        // Reload challenge only after the account lock: parallel claims/recovery codes serialize per account.
        challenge = await db.MfaChallenges.SingleAsync(x => x.Id == id, token);
        if (user is null || !user.EmailConfirmed || !user.TwoFactorEnabled || challenge.Consumed || challenge.ExpiresAt <= clock.GetUtcNow() || challenge.Attempts >= 5 || challenge.StampHash != Hash(user.SecurityStamp!) || await users.IsLockedOutAsync(user)) return Rejected();
        challenge.Attempts++;
        var valid = request.UseRecoveryCode
            ? (await users.RedeemTwoFactorRecoveryCodeAsync(user, (request.Code ?? "").Trim())).Succeeded
            : await RedeemTotp(user, request.Code, token);
        if (!valid)
        {
            await users.AccessFailedAsync(user); await db.SaveChangesAsync(token); await transaction.CommitAsync(token); return Rejected();
        }
        challenge.Consumed = true;
        await users.ResetAccessFailedCountAsync(user);
        await db.SaveChangesAsync(token); await transaction.CommitAsync(token);
        return await issuer.Issue(user, context, token, mfaVerified: true);
    }
    public async Task<IResult> Reauthenticate(ReauthenticationRequest request, HttpContext context, CancellationToken token)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(token);
        var user = await LockUser(UserId(context), token);
        if (user is null || request.Password is not { Length: >= 12 and <= 128 } || !(await signIn.CheckPasswordSignInAsync(user, request.Password, true)).Succeeded)
        { await transaction.CommitAsync(token); return Rejected(); }
        if (user.TwoFactorEnabled && !await RedeemTotp(user, request.Code, token))
        { await users.AccessFailedAsync(user); await transaction.CommitAsync(token); return Rejected(); }
        var sid = SessionId(context); var now = clock.GetUtcNow();
        await db.BrowserSessions.Where(x => x.Id == sid && x.UserId == user.Id && x.RevokedAt == null && x.ExpiresAt > now)
            .ExecuteUpdateAsync(update => update.SetProperty(x => x.ReauthenticatedAt, now), token);
        await transaction.CommitAsync(token);
        return Results.Ok(new { message = "Identity confirmed for the next five minutes." });
    }
    public async Task<IResult> Status(HttpContext context)
    {
        var user = (await users.GetUserAsync(context.User))!;
        return Results.Ok(new { enabled = user.TwoFactorEnabled, recoveryCodesRemaining = user.TwoFactorEnabled ? await users.CountRecoveryCodesAsync(user) : 0 });
    }
    public async Task<IResult> Enroll(HttpContext context, CancellationToken token)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(token);
        var user = await LockUser(UserId(context), token);
        if (user is null || !await Recent(context, token)) return StepUp();
        if (user.TwoFactorEnabled) return Results.Problem(statusCode: 409, title: "Authenticator is already enabled.");
        Ensure(await users.ResetAuthenticatorKeyAsync(user));
        var currentSession = SessionId(context);
        await db.BrowserSessions.Where(x => x.UserId == user.Id && x.Id != currentSession && x.RevokedAt == null).ExecuteUpdateAsync(update => update.SetProperty(x => x.RevokedAt, clock.GetUtcNow()), token);
        user.EnrollmentExpiresAt = clock.GetUtcNow().AddMinutes(10);
        Ensure(await users.UpdateAsync(user));
        var key = await users.GetAuthenticatorKeyAsync(user);
        var uri = "otpauth://totp/" + Uri.EscapeDataString("Caelora:" + user.Email) + "?secret=" + key + "&issuer=Caelora&digits=6&period=30";
        await transaction.CommitAsync(token);
        await issuer.Refresh(user, context, token);
        return Results.Ok(new { secret = key, provisioningUri = uri, expiresAt = user.EnrollmentExpiresAt });
    }
    public async Task<IResult> Activate(CodeRequest request, HttpContext context, CancellationToken token)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(token);
        var user = await LockUser(UserId(context), token);
        if (user is null || !await Recent(context, token)) return StepUp();
        if (user.TwoFactorEnabled || user.EnrollmentExpiresAt is null || user.EnrollmentExpiresAt <= clock.GetUtcNow() || await users.IsLockedOutAsync(user)) return Rejected();
        if (!await RedeemTotp(user, request.Code, token))
        { await users.AccessFailedAsync(user); await transaction.CommitAsync(token); return Rejected(); }
        Ensure(await users.SetTwoFactorEnabledAsync(user, true)); user.EnrollmentExpiresAt = null;
        var codes = (await users.GenerateNewTwoFactorRecoveryCodesAsync(user, 10))!.ToArray();
        await SecurityChange(user, "MfaEnabled", token); await transaction.CommitAsync(token);
        await context.SignOutAsync(IdentityConstants.ApplicationScheme);
        return Results.Ok(new { recoveryCodes = codes, message = "Authenticator enabled. Store these codes securely; every browser session has ended. Sign in again." });
    }
    public async Task<IResult> Change(string action, HttpContext context, CancellationToken token)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(token);
        var user = await LockUser(UserId(context), token);
        if (user is null || !await Recent(context, token)) return StepUp();
        if (!user.TwoFactorEnabled) return Results.Problem(statusCode: 409, title: "Enable an authenticator first.");
        string[]? codes = null;
        if (action == "disable")
        {
            Ensure(await users.SetTwoFactorEnabledAsync(user, false));
            Ensure(await users.ResetAuthenticatorKeyAsync(user));
            await users.GenerateNewTwoFactorRecoveryCodesAsync(user, 0);
        }
        else codes = (await users.GenerateNewTwoFactorRecoveryCodesAsync(user, 10))!.ToArray();
        await SecurityChange(user, action == "disable" ? "MfaDisabled" : "RecoveryCodesRegenerated", token);
        await transaction.CommitAsync(token); await context.SignOutAsync(IdentityConstants.ApplicationScheme);
        return Results.Ok(new { recoveryCodes = codes, message = "Security updated. All browser sessions ended. Sign in again." });
    }
    private async Task SecurityChange(PlatformUser user, string kind, CancellationToken token)
    {
        Ensure(await users.UpdateSecurityStampAsync(user));
        await db.BrowserSessions.Where(x => x.UserId == user.Id && x.RevokedAt == null).ExecuteUpdateAsync(update => update.SetProperty(x => x.RevokedAt, clock.GetUtcNow()), token);
        notifications.Security(user, kind); await db.SaveChangesAsync(token);
    }
    public async Task<bool> Recent(HttpContext context, CancellationToken token)
    {
        var now = clock.GetUtcNow(); var sid = SessionId(context); var uid = UserId(context);
        return await db.BrowserSessions.AnyAsync(x => x.Id == sid && x.UserId == uid && x.RevokedAt == null && x.ExpiresAt > now && x.ReauthenticatedAt > now.AddMinutes(-5), token);
    }
    public Task<PlatformUser?> LockUser(Guid id, CancellationToken token) => db.Users.FromSqlInterpolated($"SELECT * FROM platform.\"AspNetUsers\" WHERE \"Id\"={id} FOR UPDATE").SingleOrDefaultAsync(token);
    private async Task<bool> RedeemTotp(PlatformUser user, string? input, CancellationToken token)
    {
        var code = (input ?? "").Replace(" ", "", StringComparison.Ordinal).Replace("-", "", StringComparison.Ordinal);
        if (code.Length != 6 || !code.All(char.IsAsciiDigit) || !await users.VerifyTwoFactorTokenAsync(user, TokenOptions.DefaultAuthenticatorProvider, code)) return false;
        var digest = Hash(await users.GetAuthenticatorKeyAsync(user) + ":" + code); var now = clock.GetUtcNow();
        await db.TotpRedemptions.Where(x => x.UserId == user.Id && x.Digest == digest && x.ExpiresAt <= now).ExecuteDeleteAsync(token);
        if (await db.TotpRedemptions.AnyAsync(x => x.UserId == user.Id && x.Digest == digest, token)) return false;
        db.TotpRedemptions.Add(new TotpRedemption { UserId = user.Id, Digest = digest, ExpiresAt = now.AddMinutes(5) });
        await db.SaveChangesAsync(token); return true;
    }
    public static Guid UserId(HttpContext context) => Guid.Parse(context.User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    public static Guid SessionId(HttpContext context) => Guid.Parse(context.User.FindFirstValue(SessionCookieEvents.SessionClaim)!);
    private static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
    private static IResult Rejected() => Results.Problem(statusCode: 401, title: "Security verification failed or expired. Try again with a fresh code, or restart sign-in.");
    public static IResult StepUp() => Results.Problem(statusCode: 403, title: "Confirm your password and authenticator on the security page before this action.");
    private static void Ensure(IdentityResult result) { if (!result.Succeeded) throw new InvalidOperationException("Concurrent security update rejected."); }
}
