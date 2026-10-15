using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace Caelora.Platform.Api.Accounts;

public sealed record IdentityMail(string Recipient, string Subject, string Body, string? HtmlBody = null);
public interface IIdentityMailSender { Task SendAsync(IdentityMail mail, CancellationToken cancellationToken); }

// Mailpit captures real SMTP locally; Smtp uses required authenticated STARTTLS for the production adapter.
public sealed class SmtpIdentityMailSender(IOptions<AccountsOptions> settings) : IIdentityMailSender
{
    public async Task SendAsync(IdentityMail mail, CancellationToken cancellationToken)
    {
        var options = settings.Value;
        var message = new MimeMessage();
        message.From.Add(MailboxAddress.Parse(options.SenderAddress));
        message.To.Add(MailboxAddress.Parse(mail.Recipient));
        message.Subject = mail.Subject;
        message.Body = new BodyBuilder { TextBody = mail.Body, HtmlBody = mail.HtmlBody }.ToMessageBody();
        using var client = new SmtpClient { Timeout = 10000 };
        await client.ConnectAsync(options.SmtpHost, options.SmtpPort, options.EmailProvider == "Mailpit" ? SecureSocketOptions.None : SecureSocketOptions.StartTls, cancellationToken);
        if (options.EmailProvider == "Smtp") await client.AuthenticateAsync(options.SmtpUser, options.SmtpPassword, cancellationToken);
        await client.SendAsync(message, cancellationToken);
        await client.DisconnectAsync(true, cancellationToken);
    }
}
