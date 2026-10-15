using System.Net;
using Caelora.Platform.Api.Accounts;

namespace Caelora.Platform.Api.Notifications;

public static class MailTemplates
{
    public static IdentityMail Create(string recipient, string type, string? url, string origin)
    {
        var (subject, description, action) = type switch
        {
            "VerifyEmail" => ("Verify your Caelora email", "Confirm this address to begin using your account. This link expires in 30 minutes.", "Verify email"),
            "PasswordReset" => ("Reset your Caelora password", "Choose a new password. This link expires in 30 minutes and existing browser sessions will end.", "Reset password"),
            "PasswordChanged" => ("Your Caelora password changed", "Your password changed and previous browser sessions ended. If this was unexpected, recover your account immediately.", "Review account"),
            "MfaEnabled" => ("Caelora authenticator enabled", "Authenticator verification was enabled. Keep your recovery codes in a secure place.", "Review security"),
            "MfaDisabled" => ("Caelora authenticator disabled", "Authenticator verification was disabled. If you did not request this, recover your account immediately.", "Review security"),
            "SessionWarning" => ("Caelora session security", "One or more browser sessions were ended by an account security action. Review your active sessions if this was unexpected.", "Review sessions"),
            _ => ("Caelora security activity", "A significant security change occurred on your account. Open security activity to review it.", "Review security")
        };
        var destination = url ?? origin.TrimEnd('/') + "/account/security";
        var text = description + "\n\n" + destination + "\n\nCaelora · Account security. Never share passwords, authenticator codes or recovery codes. If you did not request a verification/reset email, ignore it.";
        static string E(string s) => WebUtility.HtmlEncode(s);
        var html = "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width\"></head><body style=\"margin:0;background:#0d1c1d;color:#eee7d8;font-family:Segoe UI,Arial,sans-serif;line-height:1.7\"><main style=\"max-width:560px;margin:32px auto;padding:32px\"><p style=\"color:#d6b27a;letter-spacing:4px\">CAELORA</p><h1 style=\"font-size:26px;line-height:1.3\">" + E(subject) + "</h1><p>" + E(description) + "</p><p style=\"margin:32px 0\"><a style=\"display:inline-block;background:#d6b27a;color:#182221;padding:12px 22px;text-decoration:none\" href=\"" + E(destination) + "\">" + E(action) + "</a></p><p style=\"font-size:13px\">Never share passwords, authenticator codes or recovery codes. If you did not request a verification/reset email, ignore it.</p><hr style=\"border:0;border-top:1px solid #40514a\"><p style=\"font-size:12px;color:#b6c1b8\">Caelora · Account security</p></main></body></html>";
        return new IdentityMail(recipient, subject, text, html);
    }
}
