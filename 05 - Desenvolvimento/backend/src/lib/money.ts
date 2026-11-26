// RN-04 — cálculo do total. Toda aritmética usa Decimal (RNF-08).
import { Prisma } from '@prisma/client';

export const Decimal = Prisma.Decimal;
export type Dec = Prisma.Decimal;

export function d(v: Prisma.Decimal.Value): Dec {
  return new Decimal(v);
}

/** Valor unitário com desconto = valor × (1 − desconto/100), arredondado matematicamente (meio para cima) em 2 casas. */
export function discountedUnit(price: Prisma.Decimal.Value, discountPercent?: Prisma.Decimal.Value | null): Dec {
  const p = d(price);
  if (discountPercent === null || discountPercent === undefined) return p.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const pct = d(discountPercent);
  return p.mul(d(1).minus(pct.div(100))).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export interface LineInput {
  price: Prisma.Decimal.Value;
  discountPercent?: Prisma.Decimal.Value | null;
  quantity: number;
}

export function computeTotals(lines: LineInput[], deliveryFee: Prisma.Decimal.Value) {
  const computed = lines.map((l) => {
    const unit = discountedUnit(l.price, l.discountPercent);
    return { unitPriceDiscounted: unit, subtotal: unit.mul(l.quantity).toDecimalPlaces(2) };
  });
  const itemsTotal = computed.reduce((acc, c) => acc.plus(c.subtotal), d(0));
  const fee = d(deliveryFee);
  return { lines: computed, itemsTotal, deliveryFee: fee, total: itemsTotal.plus(fee) };
}

export const money = (v: Prisma.Decimal.Value | null | undefined) => (v === null || v === undefined ? null : d(v).toFixed(2));
