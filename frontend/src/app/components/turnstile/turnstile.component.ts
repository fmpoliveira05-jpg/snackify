import { AfterViewInit, Component, ElementRef, EventEmitter, NgZone, OnDestroy, Output, ViewChild } from '@angular/core';
import { environment } from '../../../environments/environment';

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptPromise: Promise<void> | null = null;

/** Carrega o script do Turnstile uma única vez, e só quando é mesmo preciso. */
function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Não foi possível carregar o Turnstile.'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Desafio anti-bot da Cloudflare (Turnstile).
 *
 * Só carrega o script da Cloudflare quando `environment.turnstileSiteKey` está definida;
 * sem chave não mostra nada e emite um token vazio (o backend também tem o desafio desligado).
 */
@Component({
  selector: 'app-turnstile',
  standalone: true,
  template: `<div #container class="mb-3"></div>`,
})
export class TurnstileComponent implements AfterViewInit, OnDestroy {
  /** Token do desafio (vazio quando expira ou falha). */
  @Output() token = new EventEmitter<string>();
  @ViewChild('container', { static: true }) container!: ElementRef<HTMLElement>;

  readonly enabled = Boolean(environment.turnstileSiteKey);
  private widgetId: string | null = null;

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    if (!this.enabled) return;
    loadTurnstileScript()
      .then(() => {
        if (!window.turnstile) return;
        this.widgetId = window.turnstile.render(this.container.nativeElement, {
          sitekey: environment.turnstileSiteKey,
          language: 'pt-PT',
          callback: (value: string) => this.zone.run(() => this.token.emit(value)),
          'expired-callback': () => this.zone.run(() => this.token.emit('')),
          'error-callback': () => this.zone.run(() => this.token.emit('')),
        });
      })
      .catch(() => this.token.emit(''));
  }

  /** Pede um novo desafio (os tokens só servem uma vez). */
  reset(): void {
    if (this.widgetId && window.turnstile) window.turnstile.reset(this.widgetId);
    this.token.emit('');
  }

  ngOnDestroy(): void {
    if (this.widgetId && window.turnstile) window.turnstile.remove(this.widgetId);
  }
}
