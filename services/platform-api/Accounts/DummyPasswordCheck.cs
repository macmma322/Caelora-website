using Microsoft.AspNetCore.Identity;

namespace Caelora.Platform.Api.Accounts;

// Keep nonexistent/unverified account failures from skipping the framework password work entirely.
public sealed class DummyPasswordCheck
{
    private readonly PlatformUser user = new();
    private readonly PasswordHasher<PlatformUser> hasher = new();
    private readonly string hash;
    public DummyPasswordCheck() => hash = hasher.HashPassword(user, Guid.NewGuid().ToString("N"));
    public void Verify(string password) => hasher.VerifyHashedPassword(user, hash, password);
}
