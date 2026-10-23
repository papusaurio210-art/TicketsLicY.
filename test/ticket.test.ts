import { describe, expect, it } from 'vitest';
import { validateTicket } from '../src/ticket';
import type { Ticket } from '../src/types';

const good: Ticket = {
  comercio: 'Mercado', rfc_emisor: null, fecha: '2026-10-18', hora: null, folio: null,
  moneda: 'MXN', subtotal: 100, iva: 16, propina: 0, total: 116,
  metodo_pago: 'Tarjeta', ultimos_4_tarjeta: '1234', categoria: 'Insumos', confianza: 0.95, notas: null,
};

describe('validación de tickets', () => {
  it('acepta importes consistentes', () => {
    expect(validateTicket(good, new Date('2026-10-20T00:00:00Z')).review).toBe(false);
  });
  it('marca para revisión un total inconsistente', () => {
    expect(validateTicket({ ...good, total: 150 }, new Date('2026-10-20T00:00:00Z')).review).toBe(true);
  });
  it('rechaza fechas imposibles y fotos de baja confianza', () => {
    expect(() => validateTicket({ ...good, fecha: '2026-02-30' })).toThrow('Fecha inválida');
    expect(() => validateTicket({ ...good, confianza: 0.3 })).toThrow('foto más clara');
  });
});
