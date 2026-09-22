# Snackify – cliente Angular

Cliente web usado pelos clientes e pelo administrador da plataforma. Ver o [README principal](../README.md) para a visão geral do projeto.

```bash
npm install
npm start          # http://localhost:4200 (a API tem de estar a correr em http://localhost:5000)
npm run build      # compila para dist/angular/browser, que o Express serve em produção
npm run test:ci    # testes unitários em Chrome headless
```

O endereço da API está em `src/environments/environment.ts` (desenvolvimento) e `environment.production.ts` (produção, mesmo domínio que o Express).
