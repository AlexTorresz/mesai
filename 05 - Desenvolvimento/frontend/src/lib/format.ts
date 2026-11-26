import type { OrderStatus, PaymentMethod, Role } from './types';

export function brl(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return 'R$ 0,00';
  const n = typeof v === 'number' ? v : Number(v);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function pct(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  const n = Number(v);
  return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  RECEBIDO: 'Recebido',
  EM_PREPARACAO: 'Em preparação',
  EM_TRANSPORTE: 'Em transporte',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

export const STATUS_FLOW: OrderStatus[] = ['RECEBIDO', 'EM_PREPARACAO', 'EM_TRANSPORTE', 'ENTREGUE'];

export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  RECEBIDO: 'EM_PREPARACAO',
  EM_PREPARACAO: 'EM_TRANSPORTE',
  EM_TRANSPORTE: 'ENTREGUE',
};

export const NEXT_ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  RECEBIDO: 'Aceitar → Em preparação',
  EM_PREPARACAO: 'Saiu para entrega',
  EM_TRANSPORTE: 'Marcar entregue',
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  PIX: 'Pix',
  CREDITO: 'Crédito',
  DEBITO: 'Débito',
  VALE_REFEICAO: 'Vale-refeição',
  DINHEIRO: 'Dinheiro',
};

export const ROLE_LABEL: Record<Role, string> = {
  CLIENTE: 'Cliente',
  COLABORADOR: 'Colaborador',
  GERENTE: 'Gerente',
};

export function formatCpf(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function formatPhone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function formatCep(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function time(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function minutesUntil(iso: string): number {
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60000));
}

export function minutesSince(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

/** Prévia no navegador (o valor oficial é sempre calculado no servidor — RN-04). */
export function previewDiscounted(price: number, discount: number | null): number {
  if (!discount) return Math.round(price * 100) / 100;
  const cents = price * 100 * (1 - discount / 100);
  return Math.round(cents + Number.EPSILON) / 100;
}

/** Converte "12,50" ou "12.50" em número. */
export function parseMoneyInput(v: string): number {
  const clean = v.replace(/\s/g, '').replace(/R\$/i, '');
  if (clean.includes(',')) return Number(clean.replace(/\./g, '').replace(',', '.'));
  return Number(clean);
}
