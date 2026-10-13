# Snackify — Angular Client

Web client for customers and platform administrators. See the [main README](../README.md) for the project overview.

```bash
npm install
npm start        # http://localhost:4200; API required at http://localhost:5000
npm run build    # Outputs dist/angular/browser, served by Express in production
npm run test:ci  # Unit tests in headless Chrome
```

The API URL is configured in `src/environments/environment.ts` for development and `environment.production.ts` for production, where the client shares Express's domain.
