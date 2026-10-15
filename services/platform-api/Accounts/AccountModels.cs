using Microsoft.AspNetCore.Identity;

namespace Caelora.Platform.Api.Accounts;

public sealed class PlatformUser : IdentityUser<Guid>
{
    public string DisplayName { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? EnrollmentExpiresAt { get; set; }
}

public sealed class BrowserSession
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }
    public PlatformUser User { get; set; } = null!;
    public string Descriptor { get; set; } = "Browser";
    public DateTimeOffset LastSeenAt { get; set; }
    public DateTimeOffset? ReauthenticatedAt { get; set; }
    public bool MfaAuthenticated { get; set; }
}

public sealed class SecurityEvent
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string Kind { get; set; } = "";
    public DateTimeOffset OccurredAt { get; set; }
}

public sealed record RegisterRequest(string Email, string Password, string DisplayName);
public sealed record LoginRequest(string Email, string Password);
public sealed record EmailRequest(string Email);
public sealed record ConfirmRequest(Guid UserId, string Token);
public sealed record ResetRequest(Guid UserId, string Token, string Password);
public sealed record ProfileRequest(string DisplayName);
public sealed record AccountProfile(Guid AccountId, string Email, bool EmailVerified, string DisplayName, DateTimeOffset CreatedAt);
