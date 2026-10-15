namespace Caelora.Platform.Api.Accounts;

public sealed class MfaChallenge
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string SecretHash { get; set; } = "";
    public string StampHash { get; set; } = "";
    public DateTimeOffset ExpiresAt { get; set; }
    public int Attempts { get; set; }
    public bool Consumed { get; set; }
}
public sealed class TotpRedemption
{
    public Guid UserId { get; set; }
    public string Digest { get; set; } = "";
    public DateTimeOffset ExpiresAt { get; set; }
}
public sealed record MfaChallengeRequest(string Challenge, string Code, bool UseRecoveryCode = false);
public sealed record CodeRequest(string Code);
public sealed record ReauthenticationRequest(string Password, string Code = "");
