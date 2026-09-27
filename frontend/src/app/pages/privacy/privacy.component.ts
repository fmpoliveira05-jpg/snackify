import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';

/** Versão da Política de Privacidade (igual a PRIVACY_POLICY_VERSION no backend). */
export const PRIVACY_POLICY_VERSION = '2026-09-27';

/**
 * Política de Privacidade, termos de utilização dos dados e informação sobre cookies (RGPD).
 */
@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './privacy.component.html',
})
export class PrivacyComponent {
  readonly version = PRIVACY_POLICY_VERSION;
  readonly apiUrl = environment.apiUrl;
}
