const {
  DEFAULT_SETTINGS,
  effectiveSettings,
  haversineKm,
  checkOrderAllowed,
  estimateTimes,
  validateCheckoutChoices,
} = require('../services/restaurantRules');

const PORTO = { latitude: 41.1496, longitude: -8.6109 };
const FELGUEIRAS = { latitude: 41.3647, longitude: -8.1978 };
const LISBOA = { latitude: 38.7223, longitude: -9.1393 };

describe('definições do restaurante', () => {
  test('sem definições usa os valores por omissão', () => {
    expect(effectiveSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  test('valores inválidos são ignorados', () => {
    const s = effectiveSettings({ preparationMinutes: 30, deliveryMinutes: -5, maxDeliveryKm: 'abc' });
    expect(s.preparationMinutes).toBe(30);
    expect(s.deliveryMinutes).toBe(DEFAULT_SETTINGS.deliveryMinutes);
    expect(s.maxDeliveryKm).toBe(DEFAULT_SETTINGS.maxDeliveryKm);
  });
});

describe('distância', () => {
  test('Porto–Lisboa ronda os 274 km em linha reta', () => {
    expect(haversineKm(PORTO, LISBOA)).toBeGreaterThan(270);
    expect(haversineKm(PORTO, LISBOA)).toBeLessThan(280);
  });

  test('um ponto está a 0 km de si próprio', () => {
    expect(haversineKm(PORTO, PORTO)).toBe(0);
  });
});

describe('aceitar encomendas', () => {
  const base = { settings: { maxActiveOrders: 3, maxDeliveryKm: 10 }, activeOrders: 0, fulfilment: 'entrega' };

  test('recusa quando o limite de encomendas em curso foi atingido', () => {
    expect(checkOrderAllowed({ ...base, activeOrders: 3 }).allowed).toBe(false);
  });

  test('recusa entregas fora do raio', () => {
    const r = checkOrderAllowed({ ...base, restaurantCoords: PORTO, customerCoords: FELGUEIRAS });
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/km/);
  });

  test('o raio não se aplica a levantamentos', () => {
    const r = checkOrderAllowed({ ...base, fulfilment: 'levantamento', restaurantCoords: PORTO, customerCoords: LISBOA });
    expect(r.allowed).toBe(true);
  });

  test('sem coordenadas não é possível verificar o raio e a encomenda é aceite', () => {
    expect(checkOrderAllowed({ ...base, restaurantCoords: PORTO, customerCoords: { latitude: null, longitude: null } }).allowed).toBe(true);
  });
});

describe('tempos estimados', () => {
  const now = new Date('2026-05-01T12:00:00Z');

  test('entrega soma preparação e transporte', () => {
    const t = estimateTimes({ preparationMinutes: 20, deliveryMinutes: 15 }, 'entrega', now);
    expect(t.readyAt.toISOString()).toBe('2026-05-01T12:20:00.000Z');
    expect(t.deliveredAt.toISOString()).toBe('2026-05-01T12:35:00.000Z');
  });

  test('levantamento só tem hora de preparação', () => {
    expect(estimateTimes({}, 'levantamento', now).deliveredAt).toBeNull();
  });
});

describe('escolhas no checkout', () => {
  test('por omissão é entrega com pagamento online', () => {
    expect(validateCheckoutChoices({}).value).toEqual({ fulfilment: 'entrega', paymentMethod: 'online' });
  });

  test('pagar no local exige documento de identificação', () => {
    expect(validateCheckoutChoices({ paymentMethod: 'local' }).ok).toBe(false);
    const ok = validateCheckoutChoices({ paymentMethod: 'local', identityDoc: ' 12345678 zz4 ' });
    expect(ok.ok).toBe(true);
    expect(ok.value.identityDoc).toBe('12345678 ZZ4');
  });

  test('recusa valores desconhecidos', () => {
    expect(validateCheckoutChoices({ fulfilment: 'drone' }).ok).toBe(false);
    expect(validateCheckoutChoices({ paymentMethod: { $ne: 1 } }).ok).toBe(false);
  });
});
