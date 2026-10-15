using System.Security.Cryptography.X509Certificates;
using Caelora.Platform.Api.Infrastructure;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace Caelora.Platform.Api.Accounts;

public static class AccountsRegistration
{
    public static IServiceCollection AddAccounts(this IServiceCollection services, IConfiguration configuration, IHostEnvironment environment)
    {
        services.AddSingleton(TimeProvider.System);
        services.AddSingleton<DummyPasswordCheck>();
        services.AddSingleton<IValidateOptions<AccountsOptions>, AccountsOptionsValidator>();
        services.AddOptions<AccountsOptions>().BindConfiguration("Accounts").ValidateOnStart();
        services.AddIdentityCore<PlatformUser>(options =>
        {
            options.User.RequireUniqueEmail = true;
            options.Password.RequiredLength = 12;
            options.Password.RequiredUniqueChars = 4;
            options.Password.RequireDigit = false;
            options.Password.RequireUppercase = false;
            options.Password.RequireLowercase = false;
            options.Password.RequireNonAlphanumeric = false;
            options.SignIn.RequireConfirmedEmail = true;
            options.Lockout.MaxFailedAccessAttempts = 5;
            options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
        }).AddEntityFrameworkStores<PlatformDbContext>().AddSignInManager().AddDefaultTokenProviders();
        services.Configure<DataProtectionTokenProviderOptions>(options => options.TokenLifespan = TimeSpan.FromMinutes(30));
        services.AddScoped<SessionCookieEvents>();
        services.AddScoped<IIdentityMailSender, SmtpIdentityMailSender>();
        services.AddScoped<AccountOperations>();
        services.AddAuthentication(IdentityConstants.ApplicationScheme).AddCookie(IdentityConstants.ApplicationScheme, options =>
        {
            options.Cookie.Name = "__Host-Caelora.Session";
            options.Cookie.HttpOnly = true;
            options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
            options.Cookie.SameSite = SameSiteMode.Lax;
            options.Cookie.Path = "/";
            options.SlidingExpiration = false;
            options.EventsType = typeof(SessionCookieEvents);
        });
        services.AddAuthorization();
        services.AddAntiforgery(options =>
        {
            options.HeaderName = "X-Caelora-CSRF";
            options.Cookie.Name = environment.IsDevelopment() ? "Caelora.Development.Antiforgery" : "__Host-Caelora.Antiforgery";
            options.Cookie.HttpOnly = true;
            options.Cookie.SecurePolicy = environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
            options.Cookie.SameSite = SameSiteMode.Strict;
        });
        services.AddOptions<CorsOptions>().Configure<IOptions<AccountsOptions>>((cors, settings) =>
        {
            if (settings.Value.Enabled) cors.AddPolicy("account", policy => policy.WithOrigins(settings.Value.AccountOrigin.TrimEnd('/')).WithMethods("GET", "POST", "PUT").WithHeaders("Content-Type", "X-Caelora-CSRF").AllowCredentials());
        });
        // Key storage is resolved when the provider is constructed, after test/deployment configuration has been applied.
        services.AddDataProtection().SetApplicationName("Caelora.Platform.Identity/" + environment.EnvironmentName);
        services.AddSingleton<IConfigureOptions<Microsoft.AspNetCore.DataProtection.KeyManagement.KeyManagementOptions>, AccountKeyConfiguration>();
        return services;
    }
}

public sealed class AccountKeyConfiguration(IOptions<AccountsOptions> options, IHostEnvironment environment) : IConfigureOptions<Microsoft.AspNetCore.DataProtection.KeyManagement.KeyManagementOptions>
{
    public void Configure(Microsoft.AspNetCore.DataProtection.KeyManagement.KeyManagementOptions keys)
    {
        var config = options.Value;
        if (!config.Enabled) return;
        Directory.CreateDirectory(config.KeyDirectory);
        keys.XmlRepository = new Microsoft.AspNetCore.DataProtection.Repositories.FileSystemXmlRepository(new DirectoryInfo(config.KeyDirectory), Microsoft.Extensions.Logging.Abstractions.NullLoggerFactory.Instance);
        if (!environment.IsDevelopment() && !environment.IsEnvironment("Testing"))
        {
            var certificate = X509CertificateLoader.LoadPkcs12FromFile(config.KeyCertificatePath, config.KeyCertificatePassword);
            keys.XmlEncryptor = new Microsoft.AspNetCore.DataProtection.XmlEncryption.CertificateXmlEncryptor(certificate, Microsoft.Extensions.Logging.Abstractions.NullLoggerFactory.Instance);
        }
        else if (OperatingSystem.IsWindows()) keys.XmlEncryptor = new Microsoft.AspNetCore.DataProtection.XmlEncryption.DpapiXmlEncryptor(false, Microsoft.Extensions.Logging.Abstractions.NullLoggerFactory.Instance);
    }
}
