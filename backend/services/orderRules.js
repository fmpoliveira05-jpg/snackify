/**
 * Regras de negócio das encomendas, sem dependências da base de dados nem do Express.
 * Por serem funções puras, são fáceis de testar e de reutilizar nos controladores.
 */

/** Minutos durante os quais o cliente pode cancelar uma encomenda. */
const CANCEL_WINDOW_MINUTES = 5;
/** Minutos que um carrinho fica ativo depois de lhe ser adicionado o primeiro prato. */
const CART_TIMEOUT_MINUTES = 10;
/** Cancelamentos, dentro da janela abaixo, que levam ao bloqueio do cliente. */
const CANCELLATIONS_FOR_BLOCK = 5;
const CANCELLATION_WINDOW_DAYS = 30;
const BLOCK_MONTHS = 2;
/** Número máximo de pratos num menu. */
const MAX_DISHES_PER_MENU = 10;

/**
 * Estados para onde um restaurante pode mover uma encomenda, a partir de cada estado.
 * "concluída" significa que o cliente já pagou online.
 */
const RESTAURANT_TRANSITIONS = {
  pendente: ['em preparação'],
  'concluída': ['em preparação'],
  'em preparação': ['expedida', 'entregue'],
  expedida: ['entregue'],
  entregue: [],
  cancelada: [],
};

const MINUTE = 60 * 1000;

/**
 * Um cliente pode cancelar enquanto não passarem 5 minutos e a cozinha não tiver começado.
 *
 * @param {{state: string, orderDate: Date|string}} order
 * @param {Date} [now]
 * @returns {{allowed: boolean, reason?: string}}
 */
function canCustomerCancel(order, now = new Date()) {
  if (order.state !== 'pendente') {
    return { allowed: false, reason: 'A encomenda já foi paga, está a ser preparada ou já terminou.' };
  }
  const elapsed = now.getTime() - new Date(order.orderDate).getTime();
  if (elapsed > CANCEL_WINDOW_MINUTES * MINUTE) {
    return { allowed: false, reason: `Só é possível cancelar nos primeiros ${CANCEL_WINDOW_MINUTES} minutos.` };
  }
  return { allowed: true };
}

/**
 * @param {string} from estado atual
 * @param {string} to estado pretendido
 * @returns {boolean} se o restaurante pode fazer essa mudança
 */
function isValidRestaurantTransition(from, to) {
  return (RESTAURANT_TRANSITIONS[from] || []).includes(to);
}

/**
 * Calcula até quando um cliente está impedido de encomendar.
 *
 * Regra do enunciado: quem cancelar 5 encomendas no espaço de um mês fica 2 meses sem poder
 * encomendar. O bloqueio conta a partir do 5.º cancelamento dessa janela. (A versão anterior
 * só olhava para o último mês, pelo que o bloqueio desaparecia ao fim de 30 dias.)
 *
 * @param {Array<Date|string>} cancellationDates datas dos cancelamentos do cliente
 * @param {Date} [now]
 * @returns {Date|null} fim do bloqueio, ou null se o cliente puder encomendar
 */
function computeBlockedUntil(cancellationDates, now = new Date()) {
  const dates = cancellationDates.map((d) => new Date(d)).sort((a, b) => a - b);
  let blockedUntil = null;

  for (let last = CANCELLATIONS_FOR_BLOCK - 1; last < dates.length; last++) {
    const first = dates[last - (CANCELLATIONS_FOR_BLOCK - 1)];
    const windowMs = dates[last] - first;
    if (windowMs <= CANCELLATION_WINDOW_DAYS * 24 * 60 * MINUTE) {
      const end = new Date(dates[last]);
      end.setMonth(end.getMonth() + BLOCK_MONTHS);
      if (!blockedUntil || end > blockedUntil) blockedUntil = end;
    }
  }
  return blockedUntil && blockedUntil > now ? blockedUntil : null;
}

/**
 * @param {Date|string|null} timeout fim da validade do carrinho
 * @param {Date} [now]
 * @returns {boolean}
 */
function isCartExpired(timeout, now = new Date()) {
  return Boolean(timeout) && now > new Date(timeout);
}

/**
 * Soma o preço dos itens, usando sempre os preços atuais dos pratos (nunca valores enviados
 * pelo cliente).
 *
 * @param {Array<{dishId: {pricePerDose: Array<{dose: string, price: number}>}, amount: number, dose: string}>} items
 *        itens com o prato já carregado (populate)
 * @returns {number} total em euros, arredondado ao cêntimo
 */
function computeTotal(items) {
  const total = items.reduce((sum, item) => {
    const price = item.dishId?.pricePerDose?.find((p) => p.dose === item.dose)?.price;
    return price === undefined ? sum : sum + price * item.amount;
  }, 0);
  return Math.round(total * 100) / 100;
}

module.exports = {
  CANCEL_WINDOW_MINUTES,
  CART_TIMEOUT_MINUTES,
  MAX_DISHES_PER_MENU,
  RESTAURANT_TRANSITIONS,
  canCustomerCancel,
  isValidRestaurantTransition,
  computeBlockedUntil,
  isCartExpired,
  computeTotal,
};
