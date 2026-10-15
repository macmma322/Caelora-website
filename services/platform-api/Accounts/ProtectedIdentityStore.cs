using Caelora.Platform.Api.Infrastructure;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;

namespace Caelora.Platform.Api.Accounts;

// Keep Identity's authenticator and recovery-code implementation; protect its persisted token values.
public sealed class ProtectedIdentityStore(PlatformDbContext context, IdentityErrorDescriber errors, IDataProtectionProvider protection)
    : UserStore<PlatformUser, IdentityRole<Guid>, PlatformDbContext, Guid>(context, errors)
{
    public override Task SetTokenAsync(PlatformUser user, string loginProvider, string name, string? value, CancellationToken cancellationToken)
        => base.SetTokenAsync(user, loginProvider, name, value is null ? null : "dp1:" + Protector(user, loginProvider, name).Protect(value), cancellationToken);
    public override async Task<string?> GetTokenAsync(PlatformUser user, string loginProvider, string name, CancellationToken cancellationToken)
    {
        var value = await base.GetTokenAsync(user, loginProvider, name, cancellationToken);
        if (value is null) return null;
        if (!value.StartsWith("dp1:", StringComparison.Ordinal)) throw new System.Security.Cryptography.CryptographicException("Unprotected Identity token rejected.");
        return Protector(user, loginProvider, name).Unprotect(value[4..]);
    }
    private IDataProtector Protector(PlatformUser user, string provider, string name) => protection.CreateProtector("Caelora.IdentityStore.v1", user.Id.ToString(), provider, name);
}
