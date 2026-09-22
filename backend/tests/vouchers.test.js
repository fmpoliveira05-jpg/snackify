const { applyVoucher, generateVoucherCode, VOUCHER_VALUES } = require('../services/vouchers');

describe('vales de refeição', () => {
  test('um vale maior do que o total paga tudo e fica com o resto do saldo', () => {
    expect(applyVoucher(20, 12.5)).toEqual({ discount: 12.5, remainingBalance: 7.5, toPay: 0 });
  });

  test('um vale menor do que o total é usado por inteiro', () => {
    expect(applyVoucher(5, 12.3)).toEqual({ discount: 5, remainingBalance: 0, toPay: 7.3 });
  });

  test('os códigos têm o formato VALE-XXXXXX e não se repetem facilmente', () => {
    const codes = new Set(Array.from({ length: 200 }, generateVoucherCode));
    expect(codes.size).toBe(200);
    codes.forEach((c) => expect(c).toMatch(/^VALE-[A-Z2-9]{6}$/));
  });

  test('os valores à venda são positivos', () => {
    VOUCHER_VALUES.forEach((v) => expect(v).toBeGreaterThan(0));
  });
});
