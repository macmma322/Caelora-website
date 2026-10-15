using System.Net;
using Caelora.Platform.Api.Configuration;
using Caelora.Platform.Api.Notifications;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.DataProtection;
using Xunit;

namespace Caelora.Platform.Api.Tests;

public sealed class OperationalTests(IdentityDatabase database) : IClassFixture<IdentityDatabase>
{
    [Theory]
    [InlineData(0, 120, 15, 100, 1, false)]
    [InlineData(6, 20, 15, 100, 1, false)]
    [InlineData(6, 120, 15, 0, 1, false)]
    [InlineData(6, 120, 15, 100, 2, false)]
    public void UnsafeWorkerAndReplicaConfigurationFails(int attempts, int lease, int timeout, int batch, int replicas, bool edge)
    {
        Assert.True(new DeliveryOptionsValidator().Validate(null, new DeliveryOptions { MaxAttempts = attempts, LeaseSeconds = lease, SendTimeoutSeconds = timeout, CleanupBatchSize = batch, ReplicaCount = replicas, ExternalThrottleConfigured = edge }).Failed);
    }
    [Fact]
    public void ExplicitEdgeThrottlingAllowsDocumentedMultiReplicaTopology() => Assert.True(new DeliveryOptionsValidator().Validate(null, new DeliveryOptions { ReplicaCount = 2, ExternalThrottleConfigured = true }).Succeeded);
    [Theory]
    [InlineData("0.0.0.0")]
    [InlineData("*")]
    [InlineData("127.0.0.1/8")]
    public void ProxyTrustRequiresExactAddresses(string proxy) => Assert.True(new TransportOptionsValidator().Validate(null, new TransportOptions { TrustedProxies = [proxy] }).Failed);
    [Theory]
    [InlineData(false, "127.0.0.1", 400)]
    [InlineData(true, "198.51.100.9", 400)]
    [InlineData(true, "127.0.0.1", 200)]
    public async Task OnlyExplicitTrustedProxyCanSupplyHttpsAndClientAddress(bool enabled, string remote, int expected)
    {
        using var baseline = new FoundationFactory();
        using var factory = baseline.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, config) =>
            {
                var values = new Dictionary<string, string?> { ["Transport:RequireHttps"] = "true", ["Test:RemoteIp"] = remote };
                if (enabled) values["Transport:TrustedProxies:0"] = "127.0.0.1";
                config.AddInMemoryCollection(values);
            });
            builder.ConfigureServices(services => services.AddSingleton<IStartupFilter, RemoteAddressStub>());
        });
        using var client = factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions { BaseAddress = new Uri("http://localhost") });
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/platform");
        request.Headers.Add("X-Forwarded-For", "198.51.100.7"); request.Headers.Add("X-Forwarded-Proto", "https");
        var response = await client.SendAsync(request); Assert.Equal(expected, (int)response.StatusCode);
        Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal("no-referrer", response.Headers.GetValues("Referrer-Policy").Single());
    }
    [PostgresFact]
    public void InvalidKeyDirectoryPreventsHostStartup()
    {
        using var baseline = database.Create();
        var file = Path.Combine(Path.GetTempPath(), "caelora-key-store-file-" + Guid.NewGuid().ToString("N")); File.WriteAllText(file, "not a directory");
        using var broken = baseline.WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?> { ["Accounts:KeyDirectory"] = file })));
        Assert.ThrowsAny<Exception>(() => broken.CreateClient());
        File.Delete(file); // Single test-owned temporary file, never user key material.
    }
    [PostgresFact]
    public async Task DatabaseOutageDoesNotPretendReadinessOrLeakConnectionValues()
    {
        using var baseline = database.Create();
        using var broken = baseline.WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?> { ["Platform:PostgresConnection"] = "Host=127.0.0.1;Port=1;Database=missing;Username=test;Password=private-outage-sentinel;Timeout=1" })));
        using var client = broken.CreateClient();
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/health/live")).StatusCode);
        var response = await client.GetAsync("/health/ready"); Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.DoesNotContain("private-outage-sentinel", await response.Content.ReadAsStringAsync());
    }
    [PostgresFact]
    public void CorruptKeyRepositoryPreventsHostStartup()
    {
        using var baseline = database.Create();
        var directory = Path.Combine(Path.GetTempPath(), "caelora-corrupt-keys-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        File.WriteAllText(Path.Combine(directory, "key-corrupt.xml"), "<key>invalid XML");
        using var broken = baseline.WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?> { ["Accounts:KeyDirectory"] = directory })));
        Assert.ThrowsAny<Exception>(() => broken.CreateClient());
    }
    [PostgresFact]
    public void RestoredKeyFilesCanDecryptPreviouslyProtectedState()
    {
        using var baseline = database.Create();
        var value = baseline.Services.GetRequiredService<IDataProtectionProvider>().CreateProtector("restore-probe").Protect("test-state");
        var destination = Path.Combine(Path.GetTempPath(), "caelora-restored-keys-" + Guid.NewGuid().ToString("N")); Directory.CreateDirectory(destination);
        foreach (var file in Directory.EnumerateFiles(database.KeyDirectory, "key-*.xml")) File.Copy(file, Path.Combine(destination, Path.GetFileName(file)));
        using var restored = baseline.WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?> { ["Accounts:KeyDirectory"] = destination })));
        Assert.Equal("test-state", restored.Services.GetRequiredService<IDataProtectionProvider>().CreateProtector("restore-probe").Unprotect(value));
    }
    private sealed class RemoteAddressStub(IConfiguration configuration) : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) => app =>
        {
            app.Use((context, handler) => { context.Connection.RemoteIpAddress = IPAddress.Parse(configuration["Test:RemoteIp"]!); return handler(); });
            next(app);
        };
    }
}
