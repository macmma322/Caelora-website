using Microsoft.Extensions.Options;

namespace Caelora.Platform.Api.Accounts;

public sealed class AccountsOptions
{
    public bool Enabled { get; set; }
    public string AccountOrigin { get; set; } = "";
    public int SessionHours { get; set; } = 12;
    public string EmailProvider { get; set; } = "";
    public string SmtpHost { get; set; } = "";
    public int SmtpPort { get; set; } = 1025;
    public string SenderAddress { get; set; } = "";
    public string SmtpUser { get; set; } = "";
    public string SmtpPassword { get; set; } = "";
    public string KeyDirectory { get; set; } = "";
    public string KeyCertificatePath { get; set; } = "";
    public string KeyCertificatePassword { get; set; } = "";
}

public sealed class AccountsOptionsValidator(IHostEnvironment environment, IConfiguration configuration) : IValidateOptions<AccountsOptions>
{
    public ValidateOptionsResult Validate(string? name, AccountsOptions options)
    {
        if (!options.Enabled) return ValidateOptionsResult.Success;
        var failures = new List<string>();
        var local = environment.IsDevelopment() || environment.IsEnvironment("Testing");
        if (!configuration.GetValue<bool>("Platform:PostgresEnabled")) failures.Add("Accounts requires Platform:PostgresEnabled.");
        if (!Uri.TryCreate(options.AccountOrigin, UriKind.Absolute, out var origin) || origin.AbsolutePath != "/" || origin.Query.Length != 0 || origin.Fragment.Length != 0 || origin.UserInfo.Length != 0 || origin.Host.Contains('*') ||
            (origin.Scheme != "https" && !(local && origin.IsLoopback && origin.Scheme == "http")) || (!local && origin.IsLoopback))
            failures.Add("Accounts:AccountOrigin requires an explicit safe HTTPS origin (loopback HTTP is local-only).");
        if (options.SessionHours is < 1 or > 168) failures.Add("Accounts:SessionHours must be between 1 and 168.");
        if (string.IsNullOrWhiteSpace(options.KeyDirectory) || !Path.IsPathFullyQualified(options.KeyDirectory)) failures.Add("Accounts:KeyDirectory must be an explicit absolute persisted directory.");
        if (!local && (string.IsNullOrWhiteSpace(options.KeyCertificatePath) || string.IsNullOrWhiteSpace(options.KeyCertificatePassword))) failures.Add("Accounts key-at-rest certificate configuration is required outside local environments.");
        if (options.EmailProvider != "Mailpit" && options.EmailProvider != "Smtp") failures.Add("Accounts:EmailProvider must be Mailpit or Smtp; no success-only provider is supported.");
        if (options.EmailProvider == "Mailpit" && (!local || !IsLoopback(options.SmtpHost))) failures.Add("Mailpit is local-only and must bind loopback.");
        if (string.IsNullOrWhiteSpace(options.SmtpHost) || options.SmtpPort is < 1 or > 65535 || !System.Net.Mail.MailAddress.TryCreate(options.SenderAddress, out _)) failures.Add("Accounts SMTP host/port/sender configuration is invalid.");
        if (options.EmailProvider == "Smtp" && (string.IsNullOrWhiteSpace(options.SmtpUser) || string.IsNullOrWhiteSpace(options.SmtpPassword))) failures.Add("Accounts SMTP production adapter requires authenticated STARTTLS configuration.");
        return failures.Count == 0 ? ValidateOptionsResult.Success : ValidateOptionsResult.Fail(failures);
    }
    private static bool IsLoopback(string value) => value.Equals("localhost", StringComparison.OrdinalIgnoreCase) || value == "127.0.0.1" || value == "::1";
}
