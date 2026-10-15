using Microsoft.Extensions.Options;

namespace Caelora.Platform.Api.Notifications;

public sealed class DeliveryOptions
{
    public bool WorkerEnabled { get; set; } = true;
    public int PollSeconds { get; set; } = 2;
    public int MaxAttempts { get; set; } = 6;
    public int LeaseSeconds { get; set; } = 120;
    public int SendTimeoutSeconds { get; set; } = 15;
    public int SessionRetentionDays { get; set; } = 14;
    public int SecurityRetentionDays { get; set; } = 180;
    public int NotificationRetentionDays { get; set; } = 90;
    public int OutboxRetentionDays { get; set; } = 14;
    public int CleanupBatchSize { get; set; } = 100;
    public int ReplicaCount { get; set; } = 1;
    public bool ExternalThrottleConfigured { get; set; }
}

public sealed class DeliveryOptionsValidator : IValidateOptions<DeliveryOptions>
{
    public ValidateOptionsResult Validate(string? name, DeliveryOptions o)
    {
        if (o.PollSeconds is < 1 or > 60 || o.MaxAttempts is < 1 or > 12 || o.SendTimeoutSeconds is < 1 or > 30 || o.LeaseSeconds < o.SendTimeoutSeconds * 3 || o.LeaseSeconds > 600 ||
            o.CleanupBatchSize is < 1 or > 500 || o.ReplicaCount is < 1 or > 100 || (o.ReplicaCount > 1 && !o.ExternalThrottleConfigured) ||
            new[] { o.SessionRetentionDays, o.SecurityRetentionDays, o.NotificationRetentionDays, o.OutboxRetentionDays }.Any(days => days is < 1 or > 3650))
            return ValidateOptionsResult.Fail("Delivery settings require bounded attempts/timeouts/retention/batches; multiple replicas require explicitly configured edge/distributed throttling.");
        return ValidateOptionsResult.Success;
    }
}
