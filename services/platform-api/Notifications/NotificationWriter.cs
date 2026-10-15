using System.Text;
using System.Text.Json;
using Caelora.Platform.Api.Accounts;
using Caelora.Platform.Api.Infrastructure;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;
using Microsoft.EntityFrameworkCore;

namespace Caelora.Platform.Api.Notifications;

// Adds tracked records only. The use case commits these in the same transaction as its state change.
public sealed class NotificationWriter(PlatformDbContext database, IDataProtectionProvider protection, UserManager<PlatformUser> users, IOptions<AccountsOptions> settings, TimeProvider clock)
{
    public const string PayloadPurpose = "Caelora.Outbox.Payload.v1";
    public async Task AccountLink(PlatformUser user, bool reset, string idempotencyKey)
    {
        if (database.OutboxMessages.Local.Any(x => x.IdempotencyKey == idempotencyKey) || await database.OutboxMessages.AnyAsync(x => x.IdempotencyKey == idempotencyKey)) return;
        var code = reset ? await users.GeneratePasswordResetTokenAsync(user) : await users.GenerateEmailConfirmationTokenAsync(user);
        var url = settings.Value.AccountOrigin.TrimEnd('/') + (reset ? "/reset-password" : "/verify-email") + "#userId=" + user.Id + "&token=" + WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(code));
        Enqueue(user, reset ? "PasswordReset" : "VerifyEmail", idempotencyKey, url, TimeSpan.FromMinutes(30));
    }
    public void Enqueue(PlatformUser user, string type, string key, string? actionUrl = null, TimeSpan? lifetime = null)
    {
        var now = clock.GetUtcNow();
        var mail = MailTemplates.Create(user.Email!, type, actionUrl, settings.Value.AccountOrigin);
        database.OutboxMessages.Add(new OutboxMessage
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Type = type,
            IdempotencyKey = key,
            ProtectedPayload = protection.CreateProtector(PayloadPurpose).Protect(JsonSerializer.Serialize(mail)),
            CreatedAt = now,
            NextAttemptAt = now,
            ExpiresAt = now.Add(lifetime ?? TimeSpan.FromDays(1))
        });
    }
    public void Security(PlatformUser user, string kind)
    {
        var (title, summary, type) = kind switch
        {
            "PasswordReset" => ("Your password changed", "Your password was reset and previous browser sessions ended.", "PasswordChanged"),
            "MfaEnabled" => ("Authenticator enabled", "Authenticator verification is now required when signing in.", "MfaEnabled"),
            "MfaDisabled" => ("Authenticator disabled", "Authenticator verification was removed. Review this action if it was unexpected.", "MfaDisabled"),
            "RecoveryCodesRegenerated" => ("Recovery codes replaced", "Your previous recovery codes can no longer be used.", "SecurityActivity"),
            "SessionsRevoked" => ("Browser sessions ended", "A session security action ended one or more browser sign-ins.", "SessionWarning"),
            _ => ("New browser sign-in", "A new browser session signed in. Review your active sessions if this was unexpected.", "SecurityActivity")
        };
        var id = Guid.NewGuid(); var now = clock.GetUtcNow();
        database.SecurityEvents.Add(new SecurityEvent { Id = id, UserId = user.Id, Kind = kind, OccurredAt = now });
        database.Notifications.Add(new AccountNotification
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            SecurityEventId = id,
            Title = title,
            Summary = summary,
            CreatedAt = now,
            Severity = kind == "MfaDisabled" ? "Warning" : "Information"
        });
        // Ordinary repeat sign-ins generate an inbox event; email only the first/recovery-sensitive actions.
        if (kind != "BrowserSignedIn") Enqueue(user, type, "security:" + id);
    }
}
