import { describe, it, expect } from 'vitest';
import { isValidCpf } from '../src/lib/cpf.js';
import { computeTotals, discountedUnit } from '../src/lib/money.js';

describe('CT-02 (unidade) — validação de CPF', () => {
  it('aceita CPF válido', () => expect(isValidCpf('529.982.247-25')).toBe(true));
  it('recusa dígito verificador errado', () => expect(isValidCpf('529.982.247-24')).toBe(false));
  it('recusa todos os dígitos iguais', () => expect(isValidCpf('111.111.111-11')).toBe(false));
  it('recusa tamanho errado', () => expect(isValidCpf('1234567890')).toBe(false));
});

describe('CT-23 (unidade) — RN-04 cálculo do total', () => {
  it('arredonda o unitário com desconto meio-para-cima em 2 casas', () => {
    expect(discountedUnit('10.05', '50').toFixed(2)).toBe('5.03'); // 5,025 → 5,03
    expect(discountedUnit('33.33', '33.3').toFixed(2)).toBe('22.23');
    expect(discountedUnit('30.00', null).toFixed(2)).toBe('30.00');
    expect(discountedUnit('59.90', '100').toFixed(2)).toBe('0.00');
  });
  it('aplica desconto por item (nunca sobre o total) e soma o frete', () => {
    const t = computeTotals(
      [
        { price: '10.00', discountPercent: '15', quantity: 3 }, // 8,50 × 3 = 25,50
        { price: '33.33', discountPercent: '33.3', quantity: 2 }, // 22,23 × 2 = 44,46
        { price: '19.99', discountPercent: null, quantity: 1 }, // 19,99
      ],
      '10.00',
    );
    expect(t.itemsTotal.toFixed(2)).toBe('89.95');
    expect(t.total.toFixed(2)).toBe('99.95');
  });
});
