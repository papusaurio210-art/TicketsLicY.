import type { Ticket } from './types';
import { sha256 } from './http';

export async function semanticKey(ticket: Ticket): Promise<string | null> {
  if (!ticket.folio || ticket.total === null) return null;
  const identity = `${ticket.comercio.trim().toLocaleLowerCase()}|${ticket.fecha}|${ticket.total.toFixed(2)}|${ticket.folio.trim().toLocaleLowerCase()}`;
  return `fingerprint:${await sha256(new TextEncoder().encode(identity).buffer)}`;
}

export const categories = ['Alimentos', 'Transporte', 'Hospedaje', 'Insumos', 'Servicios', 'Otros'] as const;

export function suspiciousYear(dateText: string, now = new Date()): boolean {
  const date = new Date(`${dateText}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || now.getUTCFullYear() - date.getUTCFullYear() !== 1) return false;
  const sameDayThisYear = new Date(date);
  sameDayThisYear.setUTCFullYear(now.getUTCFullYear());
  return Math.abs(now.getTime() - sameDayThisYear.getTime()) <= 31 * 86_400_000;
}

export const ticketSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['comercio', 'rfc_emisor', 'fecha', 'hora', 'folio', 'moneda', 'subtotal', 'iva', 'propina', 'total', 'metodo_pago', 'ultimos_4_tarjeta', 'categoria', 'confianza', 'notas'],
  properties: {
    comercio: { type: 'string' }, rfc_emisor: { type: ['string', 'null'] },
    fecha: { type: 'string' }, hora: { type: ['string', 'null'] },
    folio: { type: ['string', 'null'] }, moneda: { type: 'string' },
    subtotal: { type: ['number', 'null'] }, iva: { type: ['number', 'null'] },
    propina: { type: ['number', 'null'] }, total: { type: ['number', 'null'] },
    metodo_pago: { type: ['string', 'null'] }, ultimos_4_tarjeta: { type: ['string', 'null'] },
    categoria: { type: 'string', enum: categories }, confianza: { type: 'number' },
    notas: { type: ['string', 'null'] },
  },
} as const;

export function validateTicket(value: unknown, now = new Date()): { ticket: Ticket; review: boolean } {
  if (!value || typeof value !== 'object') throw new Error('La extracción no devolvió un ticket');
  const ticket = value as Ticket;
  if (typeof ticket.comercio !== 'string' || !ticket.comercio.trim()) throw new Error('Falta el comercio');
  if (typeof ticket.fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ticket.fecha)) throw new Error('Fecha inválida');
  if (typeof ticket.moneda !== 'string' || !ticket.moneda) throw new Error('Moneda inválida');
  if (!categories.includes(ticket.categoria)) throw new Error('Categoría inválida');
  if (typeof ticket.confianza !== 'number' || ticket.confianza < 0 || ticket.confianza > 1) throw new Error('Confianza inválida');
  for (const field of ['subtotal', 'iva', 'propina', 'total'] as const) {
    if (ticket[field] !== null && (typeof ticket[field] !== 'number' || !Number.isFinite(ticket[field]) || ticket[field] < 0)) throw new Error(`${field} inválido`);
  }
  if (ticket.total === null || ticket.confianza < 0.7) throw new Error('No pude leer el total con suficiente confianza. Envía una foto más clara.');
  const date = new Date(`${ticket.fecha}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== ticket.fecha) throw new Error('Fecha inválida');
  const earliest = new Date(now);
  earliest.setUTCMonth(earliest.getUTCMonth() - 18);
  const review = date > now || date < earliest || suspiciousYear(ticket.fecha, now) || /revisar año/i.test(ticket.notas ?? '') ||
    (ticket.subtotal !== null && ticket.iva !== null && Math.abs(ticket.subtotal + ticket.iva + (ticket.propina ?? 0) - ticket.total) > 1);
  return { ticket, review };
}
