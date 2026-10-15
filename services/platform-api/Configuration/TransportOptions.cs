using System.Net;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Options;

namespace Caelora.Platform.Api.Configuration;

public sealed class TransportOptions
{
    public string[] TrustedProxies { get; set; } = [];
    public bool RequireHttps { get; set; }
}
public sealed class TransportOptionsValidator : IValidateOptions<TransportOptions>
{
    public ValidateOptionsResult Validate(string? name, TransportOptions value) => value.TrustedProxies.Length > 8 || value.TrustedProxies.Any(x => !IPAddress.TryParse(x, out var ip) || ip.Equals(IPAddress.Any) || ip.Equals(IPAddress.IPv6Any))
        ? ValidateOptionsResult.Fail("Transport:TrustedProxies must contain at most eight explicit proxy IP addresses, never wildcard networks.") : ValidateOptionsResult.Success;
}
public sealed class ForwardingConfiguration(IOptions<TransportOptions> settings) : IConfigureOptions<ForwardedHeadersOptions>
{
    public void Configure(ForwardedHeadersOptions options)
    {
        options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        options.ForwardLimit = 1; options.RequireHeaderSymmetry = true;
        options.KnownProxies.Clear(); options.KnownIPNetworks.Clear();
        foreach (var proxy in settings.Value.TrustedProxies) options.KnownProxies.Add(IPAddress.Parse(proxy));
    }
}
