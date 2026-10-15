using System.Security.Claims;
using Caelora.Platform.Api.Notifications;
using Caelora.Platform.Api.Infrastructure;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Caelora.Platform.Api.Accounts;

public sealed class AccountOperations(PlatformDbContext database, UserManager<PlatformUser> users,
    SignInManager<PlatformUser> signIn, NotificationWriter notifications, SessionIssuer issuer, MfaOperations mfa, TimeProvider clock, DummyPasswordCheck dummy)
{
    private const string GenericEmailResponse = "If this address is eligible, an email with the next step will arrive shortly.";
    public async Task<IResult> Register(RegisterRequest request, CancellationToken token)
    {
        if (!ValidEmail(request.Email) || !ValidName(request.DisplayName) || !ValidPassword(request.Password)) return Invalid("Use a valid email, a 2–40 character display name and a password of 12–128 characters.");
        foreach (var validator in users.PasswordValidators)
            if (!(await validator.ValidateAsync(users, new PlatformUser(), request.Password)).Succeeded)
                return Invalid("Use 12–128 characters and at least four different characters in your password.");
        var existing = await users.FindByEmailAsync(request.Email.Trim());
        if (existing is not null) { dummy.Verify(request.Password); return Results.Accepted(value: new { message = GenericEmailResponse }); }
        var user = new PlatformUser { Id = Guid.NewGuid(), Email = request.Email.Trim(), DisplayName = request.DisplayName.Trim(), CreatedAt = clock.GetUtcNow() };
        // Identity's username is an internal immutable value; email/display name are not ownership identifiers.
        user.UserName = user.Id.ToString("N");
        await using var transaction = await database.Database.BeginTransactionAsync(token);
        IdentityResult result;
        try { result = await users.CreateAsync(user, request.Password); }
        catch (DbUpdateException exception) when (exception.InnerException is Npgsql.PostgresException { SqlState: "23505" })
        { database.ChangeTracker.Clear(); return Results.Accepted(value: new { message = GenericEmailResponse }); }
        if (!result.Succeeded)
        {
            if (result.Errors.Any(error => error.Code == "DuplicateEmail")) return Results.Accepted(value: new { message = GenericEmailResponse });
            return Invalid("The supplied account details could not be accepted.");
        }
        await Audit(user.Id, "AccountRegistered", token);
        await notifications.AccountLink(user, false, "registration:" + user.Id);
        await database.SaveChangesAsync(token);
        await transaction.CommitAsync(token);
        return Results.Accepted(value: new { message = GenericEmailResponse });
    }

    public async Task<IResult> Resend(EmailRequest request, CancellationToken token)
    {
        if (!ValidEmail(request.Email)) return Invalid("Enter a valid email address.");
        var user = await users.FindByEmailAsync(request.Email.Trim());
        await QueueLink(user is { EmailConfirmed: false } ? user : null, false, token);
        return Results.Accepted(value: new { message = GenericEmailResponse });
    }

    public async Task<IResult> Confirm(ConfirmRequest request, CancellationToken token)
    {
        var user = await users.FindByIdAsync(request.UserId.ToString());
        if (user is null || user.EmailConfirmed || !TryDecode(request.Token, out var decoded)) return Invalid("This verification link is invalid or has expired.");
        await using var transaction = await database.Database.BeginTransactionAsync(token);
        var result = await users.ConfirmEmailAsync(user, decoded);
        if (!result.Succeeded) return Invalid("This verification link is invalid or has expired.");
        if (!(await users.UpdateSecurityStampAsync(user)).Succeeded) return Invalid("This verification link could not be completed. Request a new link.");
        await Audit(user.Id, "EmailVerified", token);
        await transaction.CommitAsync(token);
        return Results.Ok(new { message = "Email verified. You can now sign in." });
    }

    public async Task<IResult> Login(LoginRequest request, HttpContext context, CancellationToken token)
    {
        if (!ValidEmail(request.Email) || !ValidPassword(request.Password)) return InvalidCredentials();
        var user = await users.FindByEmailAsync(request.Email.Trim());
        if (user is null || !user.EmailConfirmed) { dummy.Verify(request.Password); return InvalidCredentials(); }
        var result = await signIn.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (!result.Succeeded)
        { await Audit(user.Id, result.IsLockedOut ? "LoginLocked" : "LoginRejected", token); return InvalidCredentials(); }
        if (user.TwoFactorEnabled) return await mfa.BeginChallenge(user, context, token);
        return await issuer.Issue(user, context, token);
    }
    public async Task<IResult> Logout(HttpContext context, CancellationToken token)
    {
        if (Guid.TryParse(context.User.FindFirstValue(SessionCookieEvents.SessionClaim), out var id))
        {
            var session = await database.BrowserSessions.FindAsync([id], token);
            if (session is not null) { session.RevokedAt = clock.GetUtcNow(); await Audit(session.UserId, "BrowserSignedOut", token); }
        }
        await context.SignOutAsync(IdentityConstants.ApplicationScheme);
        return Results.NoContent();
    }

    public async Task<IResult> Forgot(EmailRequest request, CancellationToken token)
    {
        if (!ValidEmail(request.Email)) return Invalid("Enter a valid email address.");
        var user = await users.FindByEmailAsync(request.Email.Trim());
        await QueueLink(user is { EmailConfirmed: true } ? user : null, true, token);
        return Results.Accepted(value: new { message = GenericEmailResponse });
    }

    public async Task<IResult> Reset(ResetRequest request, CancellationToken token)
    {
        if (!ValidPassword(request.Password)) return Invalid("Use a password of 12–128 characters.");
        var user = await users.FindByIdAsync(request.UserId.ToString());
        if (user is not { EmailConfirmed: true } || !TryDecode(request.Token, out var decoded)) return Invalid("This password reset link is invalid or has expired.");
        await using var transaction = await database.Database.BeginTransactionAsync(token);
        var result = await users.ResetPasswordAsync(user, decoded, request.Password);
        if (!result.Succeeded) return Invalid("This password reset link is invalid or has expired.");
        var now = clock.GetUtcNow();
        await database.BrowserSessions.Where(session => session.UserId == user.Id && session.RevokedAt == null).ExecuteUpdateAsync(update => update.SetProperty(session => session.RevokedAt, now), token);
        await users.ResetAccessFailedCountAsync(user);
        await users.SetLockoutEndDateAsync(user, null);
        await Audit(user.Id, "PasswordReset", token);
        await transaction.CommitAsync(token);
        return Results.Ok(new { message = "Password reset. Existing browser sessions have been ended. Sign in with your new password." });
    }

    public async Task<IResult> Me(ClaimsPrincipal principal)
    {
        var user = await users.GetUserAsync(principal);
        return user is null ? Results.Unauthorized() : Results.Ok(Profile(user));
    }

    public async Task<IResult> UpdateProfile(ProfileRequest request, ClaimsPrincipal principal, CancellationToken token)
    {
        if (!ValidName(request.DisplayName)) return Invalid("Display name must contain 2–40 characters without control characters.");
        var user = await users.GetUserAsync(principal);
        if (user is null) return Results.Unauthorized();
        user.DisplayName = request.DisplayName.Trim();
        if (!(await users.UpdateAsync(user)).Succeeded) return Results.Problem(statusCode: 409, title: "Profile changed elsewhere. Refresh and try again.");
        await Audit(user.Id, "ProfileUpdated", token);
        return Results.Ok(Profile(user));
    }

    public async Task<IResult> Security(ClaimsPrincipal principal, CancellationToken token)
    {
        var userId = Guid.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var current = Guid.Parse(principal.FindFirstValue(SessionCookieEvents.SessionClaim)!);
        var now = clock.GetUtcNow();
        var sessions = await database.BrowserSessions.AsNoTracking().Where(session => session.UserId == userId && session.RevokedAt == null && session.ExpiresAt > now).OrderByDescending(session => session.CreatedAt)
            .Select(session => new { session.Id, session.CreatedAt, session.ExpiresAt, session.LastSeenAt, session.Descriptor, IsCurrent = session.Id == current }).ToListAsync(token);
        var events = await database.SecurityEvents.AsNoTracking().Where(item => item.UserId == userId).OrderByDescending(item => item.OccurredAt).Take(20)
            .Select(item => new { item.Kind, item.OccurredAt }).ToListAsync(token);
        return Results.Ok(new { sessions, events });
    }

    private async Task QueueLink(PlatformUser? user, bool reset, CancellationToken token)
    {
        if (user is null) return;
        await using var transaction = await database.Database.BeginTransactionAsync(token);
        await database.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM platform.\"AspNetUsers\" WHERE \"Id\"={user.Id} FOR UPDATE", token);
        await notifications.AccountLink(user, reset, (reset ? "reset:" : "verify:") + user.Id + ":" + clock.GetUtcNow().ToUnixTimeSeconds() / 60);
        await database.SaveChangesAsync(token);
        await transaction.CommitAsync(token);
    }
    private async Task Audit(Guid userId, string kind, CancellationToken token)
    {
        if (kind == "PasswordReset") notifications.Security((await users.FindByIdAsync(userId.ToString()))!, kind);
        else database.SecurityEvents.Add(new SecurityEvent { Id = Guid.NewGuid(), UserId = userId, Kind = kind, OccurredAt = clock.GetUtcNow() });
        await database.SaveChangesAsync(token);
    }
    private static AccountProfile Profile(PlatformUser user) => new(user.Id, user.Email!, user.EmailConfirmed, user.DisplayName, user.CreatedAt);
    private static bool ValidEmail(string? value) => value is { Length: > 3 and <= 254 } && System.Net.Mail.MailAddress.TryCreate(value.Trim(), out var address) && address.Address == value.Trim();
    private static bool ValidName(string? value) => value?.Trim() is { Length: >= 2 and <= 40 } name && !name.Any(char.IsControl);
    private static bool ValidPassword(string? value) => value is { Length: >= 12 and <= 128 };
    private static bool TryDecode(string? value, out string decoded)
    {
        decoded = "";
        if (value is null || value.Length > 4096) return false;
        try { decoded = System.Text.Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(value)); return true; } catch (FormatException) { return false; }
    }
    private static IResult Invalid(string message) => Results.Problem(statusCode: 400, title: message);
    private static IResult InvalidCredentials() => Results.Problem(statusCode: 401, title: "Sign-in failed. Check your details and verify your email, or try again later.");
}
