using Caelora.Platform.Api.Contracts;
using Caelora.Platform.Api.Accounts;
using Microsoft.Extensions.Options;

namespace Caelora.Platform.Api.Application;

public interface IPlatformInformation
{
    PlatformInfoV1 Read();
}

public sealed class PlatformInformation(IOptions<AccountsOptions> accounts) : IPlatformInformation
{
    public PlatformInfoV1 Read() => new("1", "foundation", accounts.Value.Enabled, false, false);
}
