using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Options;

namespace Caelora.Platform.Api.Accounts;

public sealed class IdentityKeyProbe(IOptions<AccountsOptions> options, IDataProtectionProvider provider) : IHostedService
{
    public Task StartAsync(CancellationToken token)
    {
        if (!options.Value.Enabled) return Task.CompletedTask;
        try
        {
            var protector = provider.CreateProtector("Caelora.Startup.KeyProbe.v1");
            if (protector.Unprotect(protector.Protect("startup-probe")) != "startup-probe") throw new InvalidOperationException();
        }
        catch (Exception) { throw new InvalidOperationException("Identity key storage is unavailable or invalid. Restore the configured key store; do not delete or regenerate it to restore existing sessions."); }
        return Task.CompletedTask;
    }
    public Task StopAsync(CancellationToken token) => Task.CompletedTask;
}
