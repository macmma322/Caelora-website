using Microsoft.AspNetCore.Antiforgery;
using Microsoft.Extensions.Options;

namespace Caelora.Platform.Api.Accounts;

public static class AccountEndpoints
{
    public static void MapAccounts(this WebApplication app)
    {
        if (!app.Services.GetRequiredService<IOptions<AccountsOptions>>().Value.Enabled) return;
        var account = app.MapGroup("/api/v1").RequireCors("account").WithTags("Accounts");
        account.AddEndpointFilter(async (invocation, next) =>
        {
            var context = invocation.HttpContext;
            if (!HttpMethods.IsGet(context.Request.Method))
            {
                var options = context.RequestServices.GetRequiredService<IOptions<AccountsOptions>>().Value;
                if (context.Request.Headers.Origin != options.AccountOrigin.TrimEnd('/')) return Results.Problem(statusCode: 403, title: "Request origin is not allowed.");
                try { await context.RequestServices.GetRequiredService<IAntiforgery>().ValidateRequestAsync(context); }
                catch (AntiforgeryValidationException) { return Results.Problem(statusCode: 403, title: "Security validation failed. Refresh the page and try again."); }
            }
            return await next(invocation);
        });
        account.MapGet("/auth/csrf", (HttpContext context, IAntiforgery antiforgery) => Results.Ok(new { token = antiforgery.GetAndStoreTokens(context).RequestToken }));
        var auth = account.MapGroup("/auth").RequireRateLimiting("auth");
        auth.MapPost("/register", (RegisterRequest request, AccountOperations operations, CancellationToken token) => operations.Register(request, token));
        auth.MapPost("/resend-verification", (EmailRequest request, AccountOperations operations, CancellationToken token) => operations.Resend(request, token));
        auth.MapPost("/confirm-email", (ConfirmRequest request, AccountOperations operations, CancellationToken token) => operations.Confirm(request, token));
        auth.MapPost("/login", (LoginRequest request, AccountOperations operations, HttpContext context, CancellationToken token) => operations.Login(request, context, token));
        auth.MapPost("/logout", (AccountOperations operations, HttpContext context, CancellationToken token) => operations.Logout(context, token)).RequireAuthorization();
        auth.MapPost("/forgot-password", (EmailRequest request, AccountOperations operations, CancellationToken token) => operations.Forgot(request, token));
        auth.MapPost("/reset-password", (ResetRequest request, AccountOperations operations, CancellationToken token) => operations.Reset(request, token));
        account.MapGet("/me", (AccountOperations operations, HttpContext context) => operations.Me(context.User)).RequireAuthorization();
        account.MapPut("/me/profile", (ProfileRequest request, AccountOperations operations, HttpContext context, CancellationToken token) => operations.UpdateProfile(request, context.User, token)).RequireAuthorization();
        account.MapGet("/me/security", (AccountOperations operations, HttpContext context, CancellationToken token) => operations.Security(context.User, token)).RequireAuthorization();
    }
}
