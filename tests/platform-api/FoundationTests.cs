using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Caelora.Platform.Api.Application;
using Caelora.Platform.Api.Configuration;
using Caelora.Platform.Api.Contracts;
using Caelora.Platform.Api.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Xunit;

namespace Caelora.Platform.Api.Tests;

public sealed class FoundationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Platform:PublicOrigin"] = "http://localhost:4321",
            ["Platform:CorsOrigins:0"] = "http://localhost:4200",
            ["Platform:PostgresEnabled"] = "false",
            ["Platform:RedisEnabled"] = "false"
        }));
    }
}

public sealed class FoundationTests(FoundationFactory factory) : IClassFixture<FoundationFactory>
{
    [Theory]
    [InlineData("/health/live")]
    [InlineData("/health/ready")]
    public async Task HealthDoesNotRequireProductionCredentials(string path)
    {
        using var response = await factory.CreateClient().GetAsync(path);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("Healthy", body.RootElement.GetProperty("status").GetString());
    }

    [Fact]
    public async Task CapabilityContractNeverClaimsAccountsPurchasesOrLauncherExist()
    {
        var body = await factory.CreateClient().GetFromJsonAsync<PlatformInfoV1>("/api/v1/platform");
        Assert.NotNull(body);
        Assert.Equal("1", body.ContractVersion);
        Assert.Equal("foundation", body.Stage);
        Assert.False(body.AccountsAvailable);
        Assert.False(body.PurchasesAvailable);
        Assert.False(body.LauncherAvailable);
    }

    [Theory]
    [InlineData("/api/v1/account")]
    [InlineData("/api/v1/admin/users")]
    [InlineData("/api/v1/auth/login")]
    [InlineData("/api/v1/entitlements")]
    public async Task UnimplementedSensitiveEndpointsDoNotExist(string path)
    {
        var response = await factory.CreateClient().GetAsync(path);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Theory]
    [InlineData("http://localhost:4200", true)]
    [InlineData("https://untrusted.example", false)]
    public async Task CorsAllowsOnlyConfiguredOrigins(string origin, bool allowed)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/platform");
        request.Headers.Add("Origin", origin);
        using var response = await factory.CreateClient().SendAsync(request);
        Assert.Equal(allowed, response.Headers.Contains("Access-Control-Allow-Origin"));
        Assert.False(response.Headers.Contains("Access-Control-Allow-Credentials"));
    }

    [Fact]
    public async Task OpenApiDescribesVersionedPublicContractOnly()
    {
        var text = await factory.CreateClient().GetStringAsync("/openapi/v1.json");
        Assert.Contains("/api/v1/platform", text);
        Assert.DoesNotContain("/auth/login", text);
        using var json = JsonDocument.Parse(text);
        Assert.StartsWith("3.", json.RootElement.GetProperty("openapi").GetString());
    }

    [Fact]
    public async Task UnexpectedExceptionsReturnSanitizedProblemDetails()
    {
        using var failing = factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
            services.AddSingleton<IPlatformInformation, FailingInformation>()));
        using var response = await failing.CreateClient().GetAsync("/api/v1/platform");
        var body = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Contains("traceId", body);
        Assert.DoesNotContain("sensitive-test-sentinel", body);
    }

    [Fact]
    public void DatabaseHasAnExplicitBaselineMigration()
    {
        using var db = new PlatformDbContext(new DbContextOptionsBuilder<PlatformDbContext>()
            .UseNpgsql("Host=localhost;Database=test;Username=test;Password=test").Options);
        Assert.Equal(["202610150001_InitialPlatform"], db.Database.GetMigrations().ToArray());
        Assert.Empty(db.Model.GetEntityTypes());
    }

    private sealed class FailingInformation : IPlatformInformation
    {
        public PlatformInfoV1 Read() => throw new InvalidOperationException("sensitive-test-sentinel");
    }
}

public sealed class ConfigurationTests
{
    private static PlatformOptions Local() => new() { PublicOrigin = "http://localhost:4321", CorsOrigins = ["http://localhost:4200"] };

    [Fact]
    public void DevelopmentCanRunWithDependenciesDisabled() => Assert.True(new PlatformOptionsValidator(new TestEnvironment("Development")).Validate(null, Local()).Succeeded);

    [Theory]
    [InlineData("Production")]
    [InlineData("Staging")]
    [InlineData("UnrecognizedEnvironment")]
    public void EveryNonLocalEnvironmentRejectsDevelopmentDefaults(string environment)
    {
        var result = new PlatformOptionsValidator(new TestEnvironment(environment)).Validate(null, Local());
        Assert.True(result.Failed);
        Assert.Contains(result.Failures, message => message.Contains("must both be true"));
    }

    [Theory]
    [InlineData("https://*.example.com")]
    [InlineData("https://example.com/path")]
    [InlineData("https://name:password@example.com")]
    [InlineData("http://remote.example.com")]
    public void UnsafeOriginsAreRejected(string origin)
    {
        var options = Local(); options.CorsOrigins = [origin];
        Assert.True(new PlatformOptionsValidator(new TestEnvironment("Development")).Validate(null, options).Failed);
    }

    [Fact]
    public void MissingConnectionsAreRejectedWithoutEchoingValues()
    {
        var options = Local(); options.PostgresEnabled = true; options.PostgresConnection = "sensitive-test-sentinel";
        options.RedisEnabled = true; options.RedisConnection = "";
        var result = new PlatformOptionsValidator(new TestEnvironment("Development")).Validate(null, options);
        Assert.True(result.Failed);
        Assert.DoesNotContain("sensitive-test-sentinel", string.Join(" ", result.Failures));
    }

    [Fact]
    public async Task ConfiguredUnavailableDependenciesMakeReadinessFailButLivenessPasses()
    {
        using var factory = new FoundationFactory().WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, config) =>
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Platform:PostgresEnabled"] = "true",
                ["Platform:PostgresConnection"] = "Host=127.0.0.1;Port=1;Database=test;Username=test;Password=test;Timeout=1",
                ["Platform:RedisEnabled"] = "true",
                ["Platform:RedisConnection"] = "127.0.0.1:1,abortConnect=false,connectTimeout=500,asyncTimeout=500"
            })));
        var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/health/live")).StatusCode);
        var response = await client.GetAsync("/health/ready");
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.DoesNotContain("Password", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public void ProductionStartupFailsForMissingMandatoryConfiguration()
    {
        using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder => builder.UseEnvironment("Production"));
        var exception = Assert.ThrowsAny<Exception>(() => factory.CreateClient());
        Assert.Contains("Platform:", exception.ToString());
    }

    private sealed class TestEnvironment(string name) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = name;
        public string ApplicationName { get; set; } = "Test";
        public string ContentRootPath { get; set; } = ".";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
