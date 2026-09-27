import { isStrongPassword } from './password-policy';

describe('regra das passwords', () => {
  it('aceita uma password com 10 a 64 caracteres e todos os tipos exigidos', () => {
    expect(isStrongPassword('Password#2026')).toBeTrue();
  });

  it('recusa passwords curtas, longas ou sem símbolo/maiúscula/número', () => {
    expect(isStrongPassword('Curta#1')).toBeFalse();
    expect(isStrongPassword('A#1' + 'a'.repeat(62))).toBeFalse();
    expect(isStrongPassword('SemSimbolo2026')).toBeFalse();
    expect(isStrongPassword('semmaiuscula#2026')).toBeFalse();
    expect(isStrongPassword('SemNumero#Aqui')).toBeFalse();
  });
});
