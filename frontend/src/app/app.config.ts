import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { httpResilienceInterceptor } from './interceptors/http-resilience.interceptor';

/**
 * Configuração global da aplicação (antes existia este ficheiro, mas o main.ts ignorava-o
 * e registava os providers à parte).
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' })),
    provideHttpClient(withInterceptors([authInterceptor, httpResilienceInterceptor])),
    provideAnimationsAsync(),
  ],
};
