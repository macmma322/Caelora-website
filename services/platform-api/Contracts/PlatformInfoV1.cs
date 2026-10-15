namespace Caelora.Platform.Api.Contracts;

public sealed record PlatformInfoV1(string ContractVersion, string Stage, bool AccountsAvailable,
    bool PurchasesAvailable, bool LauncherAvailable);
