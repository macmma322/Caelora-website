using Caelora.Platform.Api.Contracts;

namespace Caelora.Platform.Api.Application;

public interface IPlatformInformation
{
    PlatformInfoV1 Read();
}

public sealed class PlatformInformation : IPlatformInformation
{
    public PlatformInfoV1 Read() => new("1", "foundation", false, false, false);
}
