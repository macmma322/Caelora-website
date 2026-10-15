namespace Caelora.Platform.Api.Notifications;

public sealed class OutboxMessage
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Type { get; set; } = "";
    public string Channel { get; set; } = "Email";
    public string ProtectedPayload { get; set; } = "";
    public string IdempotencyKey { get; set; } = "";
    public string State { get; set; } = "Pending";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset NextAttemptAt { get; set; }
    public int Attempts { get; set; }
    public Guid? ClaimId { get; set; }
    public DateTimeOffset? ClaimUntil { get; set; }
    public string? LastFailure { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
}

public sealed class AccountNotification
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Category { get; set; } = "Security";
    public string Severity { get; set; } = "Information";
    public string Title { get; set; } = "";
    public string Summary { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? ReadAt { get; set; }
    public Guid? SecurityEventId { get; set; }
}
