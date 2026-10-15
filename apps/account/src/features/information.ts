import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `<span class="eyebrow">Sign-in information</span>
    <h1>Your identity.<br />Your control.</h1>
    <p>
      Caelora sign-in is not available yet. No passwords, Steam details or payment details are
      collected here.
    </p>
    <div class="notice">
      <h2>Planned account services</h2>
      <p>
        Verified email, secure sessions, Steam linking and ownership management will be introduced
        after the identity system has been implemented and reviewed.
      </p>
    </div>
    <a class="button secondary" routerLink="/">Back to welcome</a>`,
})
export class SignInInformation {}

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `<span class="eyebrow">Unavailable</span>
    <h1>This part of the journey<br />is not open yet.</h1>
    <p>
      Profile, security, sessions, devices and ownership features require a working identity
      service. No personal data is exposed at this route.
    </p>
    <a class="button secondary" routerLink="/">Return to welcome</a>`,
})
export class AccountUnavailable {}

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `<span class="eyebrow">404 / Beyond the map</span>
    <h1>This path has not<br />been charted.</h1>
    <p>The requested page could not be found.</p>
    <a class="button" routerLink="/">Return to welcome</a>`,
})
export class AccountNotFound {}
