import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Regra das passwords, igual à do backend (utils/passwordPolicy.js):
 * entre 10 e 64 caracteres, com maiúscula, minúscula, número e símbolo.
 */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 64;
export const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,64}$/;
export const PASSWORD_MESSAGE =
  'A password deve ter entre 10 e 64 caracteres e conter uma letra maiúscula, uma minúscula, um número e um símbolo.';

/** @returns true se a password cumpre a regra */
export function isStrongPassword(value: unknown): boolean {
  return typeof value === 'string' && PASSWORD_RULE.test(value);
}

/** Validador para formulários reativos. */
export const strongPasswordValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  !control.value || isStrongPassword(control.value) ? null : { weakPassword: true };
