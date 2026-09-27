# Operação em produção

Guia para pôr o Snackify a correr e mantê-lo saudável: verificações de saúde, monitorização,
cópias de segurança, teste de carga, limites, tempos máximos, cache e migrações.
As variáveis referidas estão descritas em `backend/.env.example` e `.env.example` (raiz).

## Verificações de saúde

| Endpoint | O que verifica | Resposta |
|---|---|---|
| `GET /health/live` | O processo está vivo (não toca na base de dados) | `200 {"status":"ok"}` |
| `GET /health/ready` | O MongoDB responde ao `ping` (tempo máximo de 2 s) | `200` ou `503 {"status":"indisponivel"}` |

Não revelam versões, nomes de máquinas, URIs nem mensagens de erro, têm `Cache-Control: no-store`,
ficam fora dos limites de pedidos e do redirecionamento para HTTPS (os balanceadores costumam
verificar por HTTP). Use `/health/live` como *liveness probe* e `/health/ready` como *readiness probe*
e na monitorização externa.

## Monitorização da disponibilidade

### GitHub Actions (`.github/workflows/uptime.yml`)

1. *Settings → Secrets and variables → Actions → Variables*: crie `SNACKIFY_HEALTH_URL` com o
   endereço completo, por exemplo `https://snackify.exemplo.pt/health/ready`.
2. O workflow corre a cada 15 minutos (e à mão, em *Run workflow*). Sem a variável, termina com um
   aviso e não faz nada.
3. Se o endereço não responder `200` em 3 tentativas (20 s de intervalo), o job falha — o GitHub
   envia email a quem ativou o workflow — e é aberta uma issue com a etiqueta `indisponibilidade`
   (as falhas seguintes ficam como comentários). Quando volta a responder, a issue é fechada.

Limites do `schedule` do GitHub Actions: intervalo mínimo de 5 minutos; em horas de muito uso as
execuções atrasam (minutos, por vezes mais) ou são saltadas; só corre no ramo principal; em
repositórios públicos, o GitHub desativa-o ao fim de 60 dias sem atividade no repositório.
Serve como segunda linha, não como alarme principal.

### Serviço externo (recomendado como alarme principal)

- **UptimeRobot** (plano gratuito: verificações de 5 em 5 minutos): *Add New Monitor → HTTP(s)*,
  URL `https://<domínio>/health/ready`, *Keyword*/*status* 200, alertas por email ou Telegram.
- **Better Stack Uptime** (plano gratuito: 3 minutos, página de estado): *Create monitor →
  URL returns HTTP status 200*, com o mesmo URL; ative a confirmação a partir de 2 localizações para
  evitar falsos alarmes.

Em ambos, crie um segundo monitor para `https://<domínio>/` (garante que o Angular é servido).

## Encerramento ordenado e tempos máximos

Com `SIGTERM` (ou `SIGINT`) o servidor deixa de aceitar ligações, espera pelos pedidos em curso
(até `SHUTDOWN_TIMEOUT_MS`, 10 s), pára a tarefa de limpeza e fecha a ligação ao MongoDB.
Docker, Render, Railway e Kubernetes enviam `SIGTERM` antes de parar o contentor.

| Onde | Valor por omissão | Variável |
|---|---|---|
| Pedido HTTP completo | 30 s | `HTTP_REQUEST_TIMEOUT_MS` |
| Keep-alive / cabeçalhos | 65 s / 66 s | `HTTP_KEEP_ALIVE_TIMEOUT_MS`, `HTTP_HEADERS_TIMEOUT_MS` |
| Escolher um servidor MongoDB | 5 s | `MONGO_SERVER_SELECTION_TIMEOUT_MS` |
| Socket MongoDB | 30 s | `MONGO_SOCKET_TIMEOUT_MS` |
| Consultas pesadas (`maxTimeMS`) | 5 s | `MONGO_QUERY_MAX_TIME_MS` |
| Stripe (por pedido, 2 repetições) | 10 s | `STRIPE_TIMEOUT_MS`, `STRIPE_MAX_NETWORK_RETRIES` |
| SMTP (ligação / saudação / socket) | 10 s / 10 s / 20 s | — |
| Open Food Facts / Turnstile | 5 s | — |
| Cliente Angular (cada pedido) | 15 s; um GET com falha de rede é repetido uma vez | — |

Atrás de um proxy, o keep-alive do Node tem de ser maior do que o do proxy (Nginx: `keepalive_timeout`,
AWS ALB: 60 s), senão aparecem erros 502 esporádicos.

## Limites de tamanho (uploads e corpos)

- JSON e formulários: 100 KB. Webhook do Stripe: 1 MB.
- Multipart (imagens): 1 ficheiro até 2 MB, até 50 campos de 100 KB, nomes de campo até 100
  caracteres, 60 partes; o tipo real da imagem é confirmado pelos primeiros bytes.
- No proxy, limite o corpo um pouco acima (Nginx):

  ```nginx
  client_max_body_size 3m;
  client_body_timeout 30s;
  proxy_read_timeout 35s;
  keepalive_timeout 60s;
  ```

  No Cloudflare (plano gratuito) o limite do corpo é 100 MB; o Render e o Railway não têm limite
  próprio relevante — o da aplicação é que conta.

## Limites de pedidos e quotas

Ver a secção "Limites" do README. São por instância (memória): com várias instâncias, use um
*store* partilhado (ex.: `rate-limit-redis`) ou divida os valores pelo número de instâncias.
O teste de carga usa `RATE_LIMIT_API_MAX` muito alto porque todos os pedidos vêm do mesmo IP.

## Cache

- **Servidor**: o catálogo público (restaurantes validados, pratos, menus de cada restaurante,
  categorias) fica em memória `CACHE_TTL_SECONDS` (60 s, máx. `CACHE_MAX_ENTRIES` entradas, LRU);
  qualquer escrita no back-office, na administração ou num perfil invalida-o. As consultas à
  Open Food Facts ficam 24 h (`OFF_CACHE_TTL_SECONDS`), incluindo "sem resultados".
- **HTTP**: ficheiros do Angular com *hash* no nome — `public, max-age=31536000, immutable`;
  `index.html`, CSS/JS do back-office e Bootstrap — `no-cache` (revalidação com ETag, resposta 304);
  imagens enviadas — 1 dia; API e páginas do back-office — `no-store`.
- **Angular**: as categorias são pedidas uma vez por sessão (`shareReplay`).

## Índices e migrações

Os índices estão nos modelos e o Mongoose cria os que faltam ao arrancar. Depois de um deploy que
mude índices (esta versão passou `stripeSessionId` dos vales a único e acrescentou vários),
corra uma vez:

```bash
cd backend && npm run indices    # cria os novos e remove os que já não existem nos modelos
```

Se falhar a criação de um índice único, há duplicados a corrigir primeiro, por exemplo carrinhos
repetidos do mesmo cliente:

```js
db.carts.aggregate([{ $group: { _id: "$userId", ids: { $push: "$_id" }, n: { $sum: 1 } } }, { $match: { n: { $gt: 1 } } }])
  .forEach(g => db.carts.deleteMany({ _id: { $in: g.ids.slice(1) } }))
```

Planos verificados com `explain()` num MongoDB real (teste `tests-integracao/indices.int.test.js`):
todas as consultas principais usam índice (IXSCAN), nenhuma percorre a coleção (COLLSCAN).

## Cópias de segurança

```bash
scripts/backup.sh                                   # usa o contentor do docker compose e o .env da raiz
scripts/restore.sh backups/snackify-AAAAMMDD-HHMMSS.archive.gz.age
RESTORE_DB=snackify_verificacao scripts/restore.sh <ficheiro>   # repõe noutra base de dados, para conferir
```

- `mongodump --archive --gzip` dentro do contentor; ficheiro com data/hora (UTC), `chmod 600` e
  `.sha256` ao lado (o restauro recusa ficheiros alterados).
- A password do MongoDB passa por stdin para um ficheiro temporário dentro do contentor: não
  aparece no `ps` nem no histórico da shell.
- Retenção: ficam as `BACKUP_KEEP` cópias mais recentes (7 por omissão).
- **Cifra** (obrigatória se a cópia sair da máquina — contém dados pessoais):
  - age: `age-keygen -o chave-backup.txt` (guarde a chave privada fora do servidor, por exemplo num
    gestor de passwords) e defina `BACKUP_AGE_RECIPIENT=age1...`; para repor,
    `BACKUP_AGE_IDENTITY=chave-backup.txt`.
  - GPG: `BACKUP_GPG_RECIPIENT=<email ou id da chave>`; o restauro usa o `gpg` do utilizador.
- Agendamento (cron, todos os dias às 03:17):

  ```cron
  17 3 * * * cd /srv/snackify && scripts/backup.sh >> /var/log/snackify-backup.log 2>&1
  ```

  Copie depois a pasta `backups/` para fora do servidor (ex.: `rclone copy` para um bucket com
  versões). Com MongoDB Atlas, use também os *Cloud Backups* do Atlas (planos pagos) ou este script
  com `mongodump` contra o URI do Atlas.
- **Teste do restauro** (faça-o regularmente, não só quando é preciso):

  ```bash
  scripts/testar-backup-restauro.sh
  ```

  Arranca um MongoDB descartável com autenticação, cria dados (200 contas, 1500 encomendas, vales),
  guarda o número de documentos, os índices e o `dbHash` de cada coleção, faz a cópia (cifrada com
  age se estiver instalado), apaga a base de dados, repõe e compara tudo; confirma ainda que um
  ficheiro alterado é recusado e que a retenção funciona.

## Teste de carga

```bash
cd backend && npm run carga
# CARGA_LIGACOES=100 CARGA_DURACAO=20 CARGA_LIGACOES_ESCRITA=20 (valores por omissão)
```

Arranca um MongoDB em Docker (dados em memória), cria 30 restaurantes com 3 menus e 15 pratos cada
e um cliente, liga a aplicação em modo de produção e corre três cenários com o autocannon.
Falha (código de saída 1) se houver erros, timeouts ou respostas diferentes de 2xx.

Resultado de 2026-09-27, numa máquina de 2 vCPU partilhada, com o autocannon, a aplicação e o
MongoDB na mesma máquina (os valores são um limite inferior):

| Cenário | Ligações | Pedidos | Pedidos/s | p50 | p99 | Erros / não 2xx |
|---|---|---|---|---|---|---|
| Páginas públicas (`/health/ready`, `/`, Angular) | 100 | 25 153 | 1 258 | 61 ms | 199 ms | 0 / 0 |
| API autenticada (sessão, restaurantes, pesquisa, menus, categorias) | 100 | 7 639 | 382 | 237 ms | 500 ms | 0 / 0 |
| Carrinho (adicionar + ver, mesmo cliente) | 20 | 1 174 | 117 | 163 ms | 467 ms | 0 / 0 |

O teste encontrou um problema, entretanto corrigido: com cliques simultâneos no mesmo carrinho,
a gravação do carrinho perdia quantidades e dava erros 500; a adição passou a ser uma operação
atómica do MongoDB (`$inc`/`$push`).

## Prazos de conservação (limpeza automática)

A tarefa `services/retention.js` corre de hora a hora dentro do servidor (`RETENTION_*`) ou uma vez
com `npm run limpeza` (para um cron externo). Ver `docs/RGPD.md`.

## Registos

Os registos vão para o stdout/stderr (o alojamento guarda-os). Não incluem query strings, corpos,
emails nem tokens: os erros ficam só com o nome e o código. Configure no alojamento uma retenção
de 30 dias (ver `docs/RGPD.md`).
