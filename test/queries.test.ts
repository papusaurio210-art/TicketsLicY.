import { describe, expect, it } from 'vitest';
import { monthTotals, searchTickets, visibleTickets, type TicketRecord } from '../src/queries';
function record(
  date: string,
  merchant: string,
  currency: string,
  total: number,
  state: string,
  user: number,
): TicketRecord {
  return {
    fecha: date,
    comercio: merchant,
    folio: 'A-1',
    moneda: currency,
    total,
    categoria: 'Alimentos',
    estado: state,
    userId: user,
    operationId: 'op',
    createdAt: date,
    imageAvailable: true,
    origin: 'native',
  };
}
describe('consultas de registros', () => {
  it('excluye eliminados y filtra cada usuario', () => {
    const tickets = [
      record('2026-10-20', 'Café', 'MXN', 100, 'OK', 123),
      record('2026-10-21', 'Café', 'MXN', 50, 'Eliminado', 123),
      record('2026-10-22', 'Café', 'USD', 10, 'OK', 456),
    ];
    const own = visibleTickets(tickets, 123, undefined);
    expect(own).toHaveLength(1);
    expect(monthTotals(own, '2026-10').get('MXN')).toBe(100);
    expect(visibleTickets(tickets, 456, undefined)).toHaveLength(1);
  });
  it('busca comercios sin distinguir acentos y permite meses', () => {
    const tickets = [record('2026-10-20', 'Café Central', 'MXN', 100, 'OK', 123)];
    expect(searchTickets(tickets, 'cafe')).toHaveLength(1);
    expect(searchTickets(tickets, '2026-10')).toHaveLength(1);
    expect(searchTickets(tickets, '2026-09')).toHaveLength(0);
  });
});
