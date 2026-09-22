const {
  canCustomerCancel,
  isValidRestaurantTransition,
  computeBlockedUntil,
  isCartExpired,
  computeTotal,
} = require('../services/orderRules');

const at = (iso) => new Date(iso);

describe('cancelamento de encomendas', () => {
  const now = at('2025-05-10T12:00:00Z');

  test('é permitido nos primeiros 5 minutos de uma encomenda pendente', () => {
    expect(canCustomerCancel({ state: 'pendente', orderDate: at('2025-05-10T11:56:00Z') }, now).allowed).toBe(true);
  });

  test('deixa de ser permitido depois de 5 minutos', () => {
    const result = canCustomerCancel({ state: 'pendente', orderDate: at('2025-05-10T11:54:59Z') }, now);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/5 minutos/);
  });

  test('não é permitido se a cozinha já começou', () => {
    expect(canCustomerCancel({ state: 'em preparação', orderDate: now }, now).allowed).toBe(false);
  });
});

describe('mudanças de estado feitas pelo restaurante', () => {
  test.each([
    ['pendente', 'em preparação', true],
    ['concluída', 'em preparação', true],
    ['em preparação', 'expedida', true],
    ['em preparação', 'entregue', true],
    ['expedida', 'entregue', true],
    ['pendente', 'entregue', false],
    ['entregue', 'pendente', false],
    ['cancelada', 'em preparação', false],
    ['pendente', 'estado-inventado', false],
  ])('%s → %s = %s', (from, to, expected) => {
    expect(isValidRestaurantTransition(from, to)).toBe(expected);
  });
});

describe('bloqueio por cancelamentos', () => {
  const fiveCancellations = [
    '2025-01-01', '2025-01-05', '2025-01-10', '2025-01-15', '2025-01-20',
  ].map(at);

  test('5 cancelamentos no mesmo mês bloqueiam durante 2 meses a partir do 5.º', () => {
    const blockedUntil = computeBlockedUntil(fiveCancellations, at('2025-02-01'));
    expect(blockedUntil).toEqual(at('2025-03-20'));
  });

  test('o bloqueio mantém-se depois de passar um mês (erro da versão anterior)', () => {
    expect(computeBlockedUntil(fiveCancellations, at('2025-03-01'))).not.toBeNull();
  });

  test('o bloqueio termina ao fim de 2 meses', () => {
    expect(computeBlockedUntil(fiveCancellations, at('2025-03-21'))).toBeNull();
  });

  test('4 cancelamentos não bloqueiam', () => {
    expect(computeBlockedUntil(fiveCancellations.slice(0, 4), at('2025-01-21'))).toBeNull();
  });

  test('5 cancelamentos espalhados por mais de um mês não bloqueiam', () => {
    const spread = ['2025-01-01', '2025-01-10', '2025-01-20', '2025-01-30', '2025-02-15'].map(at);
    expect(computeBlockedUntil(spread, at('2025-02-16'))).toBeNull();
  });
});

describe('carrinho', () => {
  test('expira depois do prazo', () => {
    expect(isCartExpired(at('2025-01-01T10:10:00Z'), at('2025-01-01T10:10:01Z'))).toBe(true);
    expect(isCartExpired(at('2025-01-01T10:10:00Z'), at('2025-01-01T10:09:59Z'))).toBe(false);
    expect(isCartExpired(null)).toBe(false);
  });

  test('o total usa os preços dos pratos e arredonda ao cêntimo', () => {
    const bitoque = { pricePerDose: [{ dose: '1', price: 8.9 }, { dose: '1/2', price: 5.45 }] };
    const items = [
      { dishId: bitoque, dose: '1', amount: 2 },
      { dishId: bitoque, dose: '1/2', amount: 1 },
      { dishId: bitoque, dose: 'dose-que-nao-existe', amount: 3 },
      { dishId: null, dose: '1', amount: 1 },
    ];
    expect(computeTotal(items)).toBe(23.25);
  });
});
