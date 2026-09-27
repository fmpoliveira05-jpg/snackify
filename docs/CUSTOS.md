# Custos e limites de gastos

Serviços pagos (ou com quotas) que o Snackify usa, como pôr alertas e tetos em cada um, e os
travões que existem no próprio código para evitar custos descontrolados (um bot, um ciclo de
repetições ou um abuso).

## Travões no código

| Travão | Valor por omissão | Variável |
|---|---|---|
| Pedidos à Open Food Facts por minuto (toda a instância); a mais, o prato é gravado sem dados nutricionais | 10 (limite pedido pela Open Food Facts para pesquisas) | `OFF_MAX_REQUESTS_PER_MINUTE` |
| Cache das consultas à Open Food Facts | 24 h | `OFF_CACHE_TTL_SECONDS` |
| Emails por dia (toda a instância) | 300 | `MAIL_MAX_PER_DAY` |
| Emails por destinatário por dia (impede "bombardear" uma caixa de correio) | 5 | `MAIL_MAX_PER_ADDRESS_PER_DAY` |
| Encomendas por conta por hora | 20 | `QUOTA_ORDERS_PER_HOUR` |
| Sessões de pagamento/compras de vales por conta por hora | 30 | `QUOTA_PAYMENTS_PER_HOUR` |
| Uploads por conta por hora | 30 | `QUOTA_UPLOADS_PER_HOUR` |
| Pratos criados/editados por conta por hora (cada um pode consultar a Open Food Facts) | 60 | `QUOTA_DISH_WRITES_PER_HOUR` |
| Pedidos à API por IP em 15 min | 300 | `RATE_LIMIT_API_MAX` |
| Repetições automáticas ao Stripe | 2 (com chave de idempotência) | `STRIPE_MAX_NETWORK_RETRIES` |
| Repetições automáticas no Angular | 1, só GET e só com falha de rede | — |

Os contadores são por instância: com N instâncias, o teto real é N vezes o valor (ajuste-os ou
use um *store* partilhado). Quando um teto de email é atingido, o envio falha e fica registado
sem o destinatário; o pedido do utilizador responde na mesma (mensagem genérica).

## Stripe

O Stripe não tem mensalidade: cobra uma comissão por pagamento com sucesso (tabela em
stripe.com/pt/pricing; consultar antes de publicar). Não há "gasto" a limitar, mas há riscos:

- **Fraude e *chargebacks*** (cada disputa tem custo): *Radar → Rules*, por exemplo
  `Block if :risk_level: = 'highest'`, `Review if :risk_level: = 'elevated'` e
  `Block if :card_country: != 'PT'` se só vender em Portugal; ativar 3D Secure
  (`Request 3D Secure if 3D Secure is supported`).
- **Testes de cartões roubados** (*card testing*): as quotas por conta, o limite por IP e o
  Turnstile no login já dificultam; no painel, ative os alertas de *Radar* e o limite de tentativas.
- **Alertas**: *Settings → Team and security → Notifications*: email para disputas, pagamentos
  falhados e *payouts*.
- Use chaves restritas (*Restricted keys*) só com as permissões de Checkout Sessions (escrita) e
  leitura de PaymentIntents, e rode-as se houver suspeita de fuga.
- Em desenvolvimento use só chaves `sk_test_...`.

## MongoDB Atlas (se usado em vez do Docker)

- O plano M0 é gratuito (512 MB, sem custos); os planos M10+ são pagos à hora.
- *Organization → Billing → Billing Alerts* (ou *Alerts → Add → Billing*): alerta quando a fatura
  do mês passar um valor (ex.: 10 €). Não há teto automático: o alerta é o travão.
- *Project → Alerts*: ligações perto do limite, espaço em disco > 80 %, consultas lentas, falhas
  de *backup*. Desative o *auto-scaling* de cluster/disco se quiser um custo fixo.
- *Network Access*: só os IPs do alojamento (nunca `0.0.0.0/0`); utilizador da base de dados só
  com `readWrite` na base `snackify`.

## Alojamento (Render, Railway, Fly.io, VPS)

- **Render**: os serviços têm preço fixo por instância; desative o *autoscaling* ou limite o
  número máximo de instâncias; *Workspace → Billing → Spend limit* (quando disponível) e
  notificações de faturação.
- **Railway**: *Usage → Usage limits*: defina um *hard limit* (o serviço pára ao atingir o valor)
  e um alerta abaixo dele.
- **Fly.io**: sem teto automático; alertas de faturação por email e máquinas com `auto_stop`.
- **VPS** (Hetzner, OVH, DigitalOcean): preço fixo; atenção ao tráfego acima do incluído e aos
  *snapshots*/volumes adicionais; ative os alertas de faturação da conta.
- Em todos: limite de CPU/RAM do contentor, e armazenamento das cópias de segurança com regra de
  expiração (ex.: *lifecycle* de 30 dias num bucket S3/B2).

## Fornecedor de email (SMTP)

| Fornecedor | Plano gratuito (valores de referência, confirmar) | Onde limitar |
|---|---|---|
| Brevo | 300 emails/dia | *Settings → Plan*; não passa do plano sem upgrade explícito |
| Mailgun | Plano de teste limitado | *Sending → Domain settings*; alertas de faturação |
| Amazon SES | Pago por email; conta inicia em *sandbox* | *Account dashboard → Sending quota*; AWS Budgets com alerta |
| Gmail/Workspace | ~500/dia (conta pessoal) | Não recomendado em produção |

O valor por omissão de `MAIL_MAX_PER_DAY` (300) corresponde ao plano gratuito do Brevo: ajuste-o
ao plano contratado, abaixo da quota do fornecedor, para que a aplicação pare antes de gerar
custos extra ou de o fornecedor suspender a conta.

## Cloudflare

- **Turnstile**: gratuito, sem limite de verificações no plano gratuito.
- **Proxy/CDN e DNS** (se usado): plano gratuito; não ativar serviços pagos (Argo, Load
  Balancing, Workers pagos) sem *budget*. *Notifications → Billing* para alertas.

## Open Food Facts

Gratuito e sem chave, mas com regras de uso: identificar a aplicação (User-Agent) e não passar de
10 pesquisas por minuto. O teto `OFF_MAX_REQUESTS_PER_MINUTE` e a cache de 24 h garantem isso.
Se for preciso mais, use o *dump* diário dos dados em vez da API.

## GitHub Actions

Gratuito em repositórios públicos. Em privados, os minutos do plano gratuito são limitados: o
`uptime.yml` a cada 15 minutos gasta ~3 000 execuções por mês (cerca de 1 minuto faturado cada);
em repositório privado aumente o intervalo ou use só o UptimeRobot/Better Stack. *Settings →
Billing → Spending limit* a 0 € impede custos acima do incluído.
