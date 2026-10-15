import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
  standalone: true,
  imports: [RouterLink],
  template:
    '<span class="eyebrow">Still to come</span><h1>This part of the journey<br />is not open yet.</h1><p>Game ownership and trusted-device controls are not implemented. Your browser sessions and security activity are available in your account.</p><a class="button secondary" routerLink="/account/security">Account security</a>',
})
export class AccountUnavailable {}
@Component({
  standalone: true,
  imports: [RouterLink],
  template:
    '<span class="eyebrow">404 / Beyond the map</span><h1>This path has not<br />been charted.</h1><p>The requested page could not be found.</p><a class="button" routerLink="/account">Your account</a>',
})
export class AccountNotFound {}
