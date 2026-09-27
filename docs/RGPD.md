# RGPD – Proteção de dados no Snackify

Documento interno de conformidade com o Regulamento Geral sobre a Proteção de Dados
(Regulamento (UE) 2016/679) e a Lei n.º 58/2019. A informação para os utilizadores está na
Política de Privacidade (`/privacidade` no cliente Angular), com a versão `PRIVACY_POLICY_VERSION`.

> Os campos entre parênteses retos (responsável, contacto, alojamento) têm de ser preenchidos por
> quem publicar a plataforma.

## 1. Registo das atividades de tratamento (art. 30.º)

Responsável: [nome/denominação, NIF, morada, contacto]. Encarregado de proteção de dados: não
obrigatório (sem tratamento em grande escala de categorias especiais nem monitorização sistemática).

| Atividade | Titulares | Categorias de dados | Finalidade | Fundamento (art. 6.º) | Destinatários / subcontratantes | Transferências | Prazo de conservação | Medidas |
|---|---|---|---|---|---|---|---|---|
| Contas de clientes | Clientes | Nome, username, email, telemóvel, morada (e coordenadas, se existirem), data de nascimento, NIF (opcional), fotografia (opcional), password (hash bcrypt), aceitação da política | Criar e gerir a conta; entregas; confirmar maioridade | Contrato (b) | Alojamento; SMTP (emails da conta) | Consoante o alojamento | Até apagar a conta; por confirmar: 7 dias | bcrypt 12, `select:false`, toJSON sem campos sensíveis |
| Contas de restaurantes | Responsáveis dos restaurantes | Denominação, username, email, telefone, NIF, morada, logótipo, data de fundação, definições | Validar e publicar o restaurante | Contrato (b) | Administrador; clientes (dados públicos do restaurante) | — | Até apagar a conta | Validação pelo administrador |
| Encomendas | Clientes, restaurantes | Pratos, valores, datas, estado, entrega/pagamento, código; morada e contacto do cliente (visíveis ao restaurante) | Prestar o serviço; faturação | Contrato (b); obrigação legal (c) | Restaurante da encomenda; Stripe | Stripe (EUA, DPF/CCT) | Prazo legal dos documentos de faturação (até 10 anos, confirmar com contabilista); pseudonimizadas se a conta for apagada | Transições atómicas, idempotência |
| Documento de identificação (pagamento no local) | Clientes | N.º do documento | Confirmar quem paga e levanta | Contrato (b) | Restaurante da encomenda | — | 30 dias depois de a encomenda terminar | Apagado automaticamente |
| Pagamentos | Clientes | Id da sessão e do pagamento Stripe, montantes (os dados do cartão ficam só no Stripe) | Cobrar encomendas e vales | Contrato (b); obrigação legal (c) | Stripe | EUA (DPF/CCT) | Como as encomendas | Confirmação no Stripe; índices únicos |
| Vales de refeição | Compradores e beneficiários | Código, valor, saldo, mensagem, comprador e dono | Comprar, oferecer, descontar | Contrato (b); obrigação legal (c) | Stripe | EUA | Enquanto houver saldo / prazo legal; pendentes não pagos: 2 dias | Saldo atómico |
| Avaliações | Clientes | Título, texto, fotografia | Opinião sobre a encomenda | Contrato (b) | Restaurante avaliado | — | Até apagar a conta (do cliente ou do restaurante) | Só encomendas entregues |
| Emails transacionais | Clientes, restaurantes | Email, nome, link com token (guardado só como hash) | Confirmar email, recuperar password | Contrato (b) | Fornecedor SMTP | Consoante o fornecedor | Tokens: 24 h / 30 min, depois removidos | Hash SHA-256, uso único |
| Segurança e prevenção de abusos | Todos os visitantes | IP, data/hora, caminho, tentativas de login falhadas, desafio Turnstile | Limitar abusos, força bruta e bots; investigar incidentes | Interesse legítimo (f) | Cloudflare (Turnstile, se ativo); alojamento (registos) | Cloudflare (EUA, DPF) | Contadores em memória (≤ 24 h); bloqueio de conta 15 min; registos 30 dias | Registos sem emails, tokens nem query strings |
| Informação nutricional | — (sem dados pessoais) | Nome do prato | Calorias, Nutri-Score, alergénios | — | Open Food Facts | França | — | — |
| Gráficos | Clientes, restaurantes | IP (pedido do script ao Google) | Mostrar o gráfico das encomendas | Interesse legítimo (f) | Google (gstatic.com) | EUA (DPF) | Não controlado por nós | Carregado só na página do gráfico; sem cookies |
| Cópias de segurança | Todos | Toda a base de dados | Recuperar de falhas | Interesse legítimo (f); art. 32.º | Local de armazenamento das cópias | [a indicar] | 7 cópias (rotação) | Cifra age/GPG, `chmod 600`, sha256 |

## 2. Direitos dos titulares (art. 12.º a 22.º)

| Direito | Como é exercido | Implementação |
|---|---|---|
| Informação (13.º) | Política de Privacidade, ligada no rodapé do Angular, na barra do back-office e no registo | `frontend/src/app/pages/privacy` |
| Acesso e portabilidade (15.º, 20.º) | Perfil → "Descarregar os meus dados" (JSON) | `GET /user/perfil/exportar` (máx. `QUOTA_EXPORTS_PER_DAY` por dia) |
| Retificação (16.º) | Perfil → "Editar perfil" (email e username não mudam: pedir por email) | `PUT /user/perfil/editar` |
| Apagamento (17.º) | Perfil → "Apagar conta" (pede a password) | `POST /user/perfil/eliminar`, `services/accountData.js` |
| Oposição, limitação, outros | Email para o contacto do responsável; resposta num mês (12.º, n.º 3) | Manual |
| Reclamação | CNPD – www.cnpd.pt | Indicado na política |

### O que acontece ao apagar a conta

- **Cliente**: são apagados a conta, o carrinho, as avaliações e as respetivas fotografias, e a
  fotografia de perfil. As encomendas ficam **pseudonimizadas** (sem `userId`, sem documento de
  identificação, marcadas `customerDeleted`), porque o restaurante tem de conservar os documentos de
  venda. Os vales de que o cliente é dono são cancelados e perdem a ligação à conta (o saldo é
  perdido; a página avisa antes); um vale que ofereceu a outra pessoa continua válido para ela, sem
  ligação ao comprador. As sessões deixam de valer (a conta já não existe) e o cookie é apagado.
- **Restaurante**: são apagados a conta, os menus, os pratos e as imagens, o logótipo e as
  avaliações recebidas (e fotografias). As encomendas recebidas ficam no histórico dos clientes
  (obrigação legal), sem ligação ativa ao restaurante ("restaurante removido").
- **Encomendas em curso** impedem o apagamento (409) até terminarem.
- **Administradores** não são apagados por esta via (a gestão de administradores é feita pelo
  responsável, para não deixar a plataforma sem administrador).
- Cópias de segurança: os dados apagados desaparecem das cópias ao fim da rotação (7 cópias). Se
  uma cópia for reposta, reaplicar os apagamentos pedidos entretanto (manter uma lista dos ids apagados).

## 3. Minimização (art. 5.º, n.º 1, al. c)) — revisão dos campos

| Campo | Decisão | Justificação |
|---|---|---|
| NIF do cliente | Opcional | Só é preciso para faturas com NIF. |
| NIF do restaurante | Obrigatório | Identificação do operador económico validado pelo administrador. |
| Data de nascimento do cliente | Obrigatória | Confirma a maioridade para contratar e pagar online (18 anos). Alternativa a considerar: substituir por uma declaração "tenho 18 anos ou mais" e deixar de guardar a data. |
| Telemóvel | Obrigatório | Contacto do restaurante/estafeta sobre a encomenda. |
| Morada | Obrigatória | Entregas e cálculo do raio de entrega. |
| Fotografia de perfil / logótipo | Opcional | — |
| Documento de identificação | Só no pagamento no local | Apagado 30 dias depois de a encomenda terminar. |
| Marketing | Não existe | Não há caixa de consentimento para marketing porque não há marketing. |

## 4. Conservação e limpeza automática

`services/retention.js` (de hora a hora; `npm run limpeza` para correr uma vez):

| Dados | Prazo | Variável |
|---|---|---|
| Contas (clientes e restaurantes) que nunca confirmaram o email, com as imagens | 7 dias (índice TTL no MongoDB aos 8 dias como rede de segurança) | `UNVERIFIED_ACCOUNT_DAYS` |
| Hashes de tokens de verificação/recuperação expirados | Assim que expiram (24 h / 30 min) | — |
| Documento de identificação das encomendas | 30 dias após a encomenda terminar | `IDENTITY_DOC_RETENTION_DAYS` |
| Vales pendentes nunca pagos | 2 dias | `PENDING_VOUCHER_DAYS` |
| Contadores dos limites de pedidos | Janela do limite (≤ 24 h), em memória | — |
| Registos do servidor | 30 dias (configurar no alojamento) | — |
| Cópias de segurança | 7 cópias | `BACKUP_KEEP` |

## 5. Cookies e armazenamento no browser (Lei n.º 41/2004, art. 5.º)

Só existe **um cookie**, estritamente necessário: a sessão (`__Host-snackify` em produção,
`token` em desenvolvimento), `HttpOnly`, `Secure` (produção), `SameSite=Strict`, `Path=/`, sem
`Domain`, válido 1 hora. Não é pedido consentimento porque não há cookies não essenciais.

- `localStorage`: não é usado.
- `sessionStorage`: só o indicador de interface `showSuccessToast` (sem dados pessoais), apagado
  logo que é lido e limpo no logout. O `sessionStorage` é de cada separador e o browser apaga-o ao
  fechar o separador.
- Verificação automática num Chromium real: `npm run test:navegador` (regista, confirma o email,
  entra e verifica que não há tokens nem dados pessoais no armazenamento, que o cookie é HttpOnly e
  SameSite=Strict e que o logout o apaga). O atributo `Secure` é verificado em `tests/cookies.test.js`.

### Terceiros carregados pelo browser — decisão

Verificação feita em 2026-09-27 com `curl -D -` aos recursos: nenhum dos pedidos abaixo devolveu
`Set-Cookie`.

| Recurso | Antes | Decisão |
|---|---|---|
| Bootstrap (jsDelivr) | CDN em todas as páginas | **Servido pelo próprio servidor** (npm `bootstrap`, `/vendor/bootstrap` no back-office e build do Angular). O IP dos utilizadores deixa de ir para a CDN. |
| Google Fonts (Roboto, Material Icons) | CDN do Google em todas as páginas do Angular | **Roboto incluído no build** (`@fontsource/roboto`); Material Icons removido (não era usado). Evita a transferência do IP para o Google (cf. LG München I, 20.01.2022). |
| Google Charts (gstatic.com) | Carregado em todas as páginas do Angular | **Carregado só nas páginas com gráfico** (painel do cliente e do restaurante). Os termos do Google Charts não permitem servir o código localmente; sem cookies; indicado na política como destinatário (IP) com base no interesse legítimo. Alternativa se se quiser zero terceiros: trocar por um gráfico SVG próprio. |
| Cloudflare Turnstile | Registo, login e recuperação (se configurado) | Mantido: medida de segurança estritamente necessária (interesse legítimo); indicado na política. |
| Stripe Checkout | Página do Stripe (redirecionamento) | Mantido: necessário para pagar; os cookies do Stripe são definidos no domínio do Stripe, durante o pagamento. |

Conclusão: sem cookies não essenciais nem rastreio, logo sem banner de consentimento.

## 6. Segurança do tratamento (art. 32.º)

- **Transporte**: HTTPS obrigatório em produção (redirecionamento 308 e HSTS de 1 ano).
- **Autenticação**: passwords com bcrypt (custo 12) e regra de complexidade; bloqueio de 15 min
  após 5 falhas; mensagens de erro iguais; confirmação do email; recuperação com token de uso
  único (30 min) guardado só como hash; "terminar todas as sessões".
- **Sessão**: JWT HS256 (emissor, público, `jti`, versão) só num cookie `HttpOnly`/`Secure`/
  `SameSite=Strict`; nunca no corpo nem no `localStorage`.
- **Aplicação**: CSP com nonce, CSRF por origem, `sanitizeFilter` contra injeção NoSQL,
  controlo de acesso por dono do recurso, uploads validados pelos primeiros bytes e servidos com
  `sandbox`, limites de pedidos e quotas por conta, erros sem pormenores internos, respostas da API
  com `no-store`, registos sem dados pessoais nem tokens.
- **Dados**: campos sensíveis com `select:false` e removidos do `toJSON`/`toObject` (testado);
  pseudonimização ao apagar contas; limpeza automática; cópias cifradas (age/GPG) com verificação
  sha256 e teste de restauro.
- **Infraestrutura**: MongoDB com autenticação e só em `127.0.0.1` (docker-compose) ou Atlas com
  lista de IPs; segredos só em variáveis de ambiente (gitleaks na CI); dependências auditadas
  (`npm audit`) na CI.
- **Disponibilidade**: `/health/ready`, monitorização externa, encerramento ordenado, tempos máximos.

## 7. Violação de dados pessoais (art. 33.º e 34.º)

1. **Detetar e conter** (hora 0): quem detetar avisa o responsável. Conter: revogar credenciais
   (`JWT_SECRET` novo invalida todas as sessões; rodar passwords do MongoDB, SMTP, chaves do
   Stripe e do Turnstile), bloquear o acesso indevido, preservar registos.
2. **Avaliar** (até 24 h): que dados, quantos titulares, que risco (ex.: hashes bcrypt vs. dados
   de contacto vs. documentos de identificação). Registar tudo no registo interno de violações
   (data, factos, efeitos, medidas) — obrigatório mesmo que não se notifique (art. 33.º, n.º 5).
3. **Notificar a CNPD em até 72 h** após ter conhecimento, se houver risco para os titulares
   (formulário em www.cnpd.pt). Se não houver toda a informação, notificar por fases.
4. **Comunicar aos titulares** sem demora injustificada se o risco for elevado (art. 34.º), em
   linguagem clara: o que aconteceu, dados afetados, medidas tomadas, o que devem fazer (ex.:
   mudar a password), contacto.
5. **Subcontratantes** (Stripe, fornecedor SMTP, alojamento, Cloudflare) têm de avisar o
   responsável sem demora; confirmar estes prazos nos respetivos acordos de tratamento de dados (DPA).
6. **Rever**: causa, correções, testes de regressão, atualização deste documento.

## 8. Avaliação de impacto (art. 35.º)

Não é obrigatória: não há tratamento em grande escala de categorias especiais, perfis com efeitos
jurídicos nem monitorização sistemática de zonas públicas. Reavaliar se forem acrescentados
geolocalização em tempo real, perfis de consumo ou marketing.
