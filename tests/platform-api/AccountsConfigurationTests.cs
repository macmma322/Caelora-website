using Caelora.Platform.Api.Accounts;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Xunit;

namespace Caelora.Platform.Api.Tests;

public sealed class AccountsConfigurationTests
{
    private static AccountsOptions Local() => new()
    {
        Enabled = true,
        AccountOrigin = "http://localhost:4200",
        EmailProvider = "Mailpit",
        SmtpHost = "127.0.0.1",
        SmtpPort = 1025,
        SenderAddress = "accounts@caelora.test",
        KeyDirectory = Path.GetTempPath()
    };
    private static AccountsOptionsValidator Validator(string environment = "Development", bool postgres = true) => new(new EnvironmentStub(environment),
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["Platform:PostgresEnabled"] = postgres.ToString() }).Build());
    [Fact]
    public void ExplicitLocalMailpitConfigurationIsValid() => Assert.True(Validator().Validate(null, Local()).Succeeded);
    [Fact]
    public void AccountsCannotSilentlyRunWithoutPostgres() => Assert.True(Validator(postgres: false).Validate(null, Local()).Failed);
    [Theory]
    [InlineData("https://*.example.com")]
    [InlineData("https://account.example.com/callback")]
    [InlineData("https://name:secret@example.com")]
    [InlineData("http://remote.example.com")]
    public void UnsafeAccountOriginsFail(string origin)
    {
        var options = Local(); options.AccountOrigin = origin;
        Assert.True(Validator().Validate(null, options).Failed);
    }
    [Fact]
    public void ProductionRejectsLocalMailAndMissingKeyEncryption()
    {
        var result = Validator("Production").Validate(null, Local());
        Assert.True(result.Failed);
        Assert.Contains(result.Failures, message => message.Contains("certificate", StringComparison.Ordinal));
        Assert.Contains(result.Failures, message => message.Contains("Mailpit", StringComparison.Ordinal));
    }
    [Fact]
    public void UnboundedSessionsAndRelativeKeyStorageFail()
    {
        var options = Local(); options.SessionHours = 0; options.KeyDirectory = "relative";
        Assert.True(Validator().Validate(null, options).Failed);
    }
    private sealed class EnvironmentStub(string name) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = name;
        public string ApplicationName { get; set; } = "Test";
        public string ContentRootPath { get; set; } = ".";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
