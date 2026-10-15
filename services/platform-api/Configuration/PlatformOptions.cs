using Microsoft.Extensions.Options;
using Npgsql;
using StackExchange.Redis;

namespace Caelora.Platform.Api.Configuration;

public sealed class PlatformOptions
{
    public const string Section = "Platform";
    public string PublicOrigin { get; set; } = "";
    public string[] CorsOrigins { get; set; } = [];
    public bool PostgresEnabled { get; set; }
    public bool RedisEnabled { get; set; }
    public string PostgresConnection { get; set; } = "";
    public string RedisConnection { get; set; } = "";
}

public sealed class PlatformOptionsValidator(IHostEnvironment environment) : IValidateOptions<PlatformOptions>
{
    public ValidateOptionsResult Validate(string? name, PlatformOptions value)
    {
        var errors = new List<string>();
        var local = environment.IsDevelopment() || environment.IsEnvironment("Testing");
        if (!IsOrigin(value.PublicOrigin, local)) errors.Add("Platform:PublicOrigin must be an absolute origin; HTTPS and a non-loopback host are required outside local environments.");
        if (value.CorsOrigins.Length == 0 || value.CorsOrigins.Any(x => !IsOrigin(x, local)))
            errors.Add("Platform:CorsOrigins requires explicit valid origins; wildcards, paths and credentials are forbidden.");
        if (!local && (!value.PostgresEnabled || !value.RedisEnabled))
            errors.Add("Platform:PostgresEnabled and Platform:RedisEnabled must both be true outside Development/Testing.");

        if (value.PostgresEnabled)
        {
            try
            {
                var connection = new NpgsqlConnectionStringBuilder(value.PostgresConnection);
                if (string.IsNullOrWhiteSpace(connection.Host) || string.IsNullOrWhiteSpace(connection.Database) || string.IsNullOrWhiteSpace(connection.Username) || string.IsNullOrWhiteSpace(connection.Password))
                    errors.Add("Platform:PostgresConnection requires host, database, username and password.");
                if (!local && (connection.SslMode != SslMode.VerifyFull || IsLocalHost(connection.Host ?? "")))
                    errors.Add("Platform:PostgresConnection requires SSL Mode=VerifyFull and a non-local host outside local environments.");
            }
            catch (ArgumentException) { errors.Add("Platform:PostgresConnection is invalid."); }
        }
        if (value.RedisEnabled)
        {
            try
            {
                var connection = ConfigurationOptions.Parse(value.RedisConnection);
                if (connection.EndPoints.Count == 0) errors.Add("Platform:RedisConnection requires an endpoint.");
                if (!local && (!connection.Ssl || string.IsNullOrWhiteSpace(connection.Password)))
                    errors.Add("Platform:RedisConnection requires TLS and authentication outside local environments.");
            }
            catch (ArgumentException) { errors.Add("Platform:RedisConnection is invalid."); }
        }
        return errors.Count == 0 ? ValidateOptionsResult.Success : ValidateOptionsResult.Fail(errors);
    }

    private static bool IsLocalHost(string host) => host.Equals("localhost", StringComparison.OrdinalIgnoreCase) || host == "127.0.0.1" || host == "::1";
    private static bool IsOrigin(string input, bool local) => Uri.TryCreate(input, UriKind.Absolute, out var uri)
        && (uri.Scheme == "https" || (local && uri.Scheme == "http" && uri.IsLoopback))
        && (local || !uri.IsLoopback) && uri.AbsolutePath == "/" && uri.Query.Length == 0
        && uri.Fragment.Length == 0 && uri.UserInfo.Length == 0 && !uri.Host.Contains('*');
}
