# Manual de utilização

Este guia percorre a plataforma com os três tipos de conta. Assume que a API está em `http://localhost:5000`, o cliente Angular em `http://localhost:4200` e que já correu `npm run seed` (ver README).

## 1. Administrador – aprovar restaurantes

1. Entrar em `http://localhost:4200/login` com `admin` / `Admin#2025`.
2. No perfil há três áreas:
   - **Validar restaurantes** – lista os registos pendentes; cada um pode ser aprovado ou rejeitado.
   - **Restaurantes validados** – permite desativar um restaurante (perde o acesso de imediato) ou removê-lo.
   - **Categorias** – criar e apagar categorias de pratos (carne, peixe, vegetariano...).

Enquanto não for aprovado, um restaurante não consegue iniciar sessão.

## 2. Restaurante – montar a carta

1. Registar o restaurante em `http://localhost:5000/register/registar-restaurante` (nome, NIF válido, morada, logótipo...).
2. Pedir ao administrador que o aprove e depois iniciar sessão. O restaurante é encaminhado para o seu painel.
3. **Pratos** → *Novo prato*: nome, categoria, descrição, fotografia e preço para meia dose e/ou dose inteira. A informação nutricional é pedida automaticamente ao Open Food Facts a partir do nome do prato.
4. **Menus** → *Novo menu*: título, descrição e até 10 pratos. Os menus podem ser editados, pesquisados por texto ou por preço e removidos.
5. **Painel** – gráfico com o número de encomendas em cada estado.
6. **Encomendas** – na opção *perfil* da barra de navegação (que abre o cliente Angular) aparece o histórico de encomendas do restaurante. Cada encomenda avança por etapas com os botões *Iniciar preparação*, *Alterar para expedida* e *Entregue no restaurante*/*entregue*: *pendente* (ou *concluída*, se já foi paga online) → *em preparação* → *expedida* → *entregue*. Não é possível saltar etapas nem voltar atrás.
7. **Avaliações** – comentários e fotografias deixados pelos clientes.

## 3. Cliente – encomendar

1. Registar a conta em `http://localhost:5000/register/registar-cliente` e iniciar sessão no cliente Angular.
2. **Restaurantes** → escolher um restaurante → escolher um menu → adicionar pratos ao carrinho, indicando a dose e a quantidade. Um carrinho só pode ter pratos de um restaurante.
3. **Carrinho** – mostra o total e um contador: o carrinho é esvaziado automaticamente 10 minutos depois de lá ter sido posto o primeiro prato.
4. **Finalizar** – cria a encomenda com um código (ex.: `ORD-M8K2...`). O pagamento pode ser feito no local, apresentando o código, ou online com o Stripe (se estiver configurado).
5. **Cancelar** – possível nos primeiros 5 minutos e só enquanto a encomenda estiver pendente. Atenção: 5 cancelamentos no espaço de um mês bloqueiam novas encomendas durante 2 meses; o painel do cliente mostra até quando dura o bloqueio.
6. **Avaliar** – quando o restaurante marca a encomenda como entregue, aparece a opção de deixar um comentário com fotografia (uma avaliação por encomenda).

## Pagamentos de teste com o Stripe

Com uma chave `sk_test_...` no `.env`, o botão de pagamento abre o checkout do Stripe. Dados de teste:

| Campo | Valor |
|---|---|
| Cartão | `4242 4242 4242 4242` |
| Validade | qualquer data futura |
| CVC | quaisquer 3 dígitos |

No fim, o Stripe devolve o cliente à API, que confirma o pagamento junto do Stripe antes de marcar a encomenda como *concluída*.

## Documentação da API

A lista completa de endpoints, com parâmetros e respostas, está em `http://localhost:5000/api-docs` (Swagger). Os pedidos autenticados usam o cookie `token` definido no login ou o cabeçalho `Authorization: Bearer <token>`.
