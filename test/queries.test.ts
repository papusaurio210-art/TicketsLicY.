import { describe, expect, it } from 'vitest';
import { monthTotals, parseTickets, searchTickets, visibleTickets } from '../src/queries';

const header = ['Fecha captura', 'Fecha ticket', 'Comercio', 'RFC', 'Folio', 'Moneda', 'Subtotal', 'IVA', 'Propina', 'Total', 'Método de pago', 'Categoría', 'Confianza', 'Estado', 'Link Drive', 'Quién lo envió', 'ID de operación', 'Hash'];
const row = (date: string, merchant: string, currency: string, amount: number, status: string, user: number) =>
  ['2026-10-23T12:00:00Z', date, merchant, '', 'A-1', currency, '', '', '', amount, '', 'Alimentos', 0.9, status, '', user, 'op', 'hash'];

describe('consultas de la hoja', () => {
  it('filtra por dueño y excluye registros eliminados de los totales', () => {
    const tickets = parseTickets([header, row('2026-10-20', 'Café', 'MXN', 100, 'OK', 123),
      row('2026-10-21', 'Café', 'MXN', 50, 'Eliminado', 123), row('2026-10-22', 'Café', 'USD', 10, 'OK', 456)]);
    const own = visibleTickets(tickets, 123, undefined);
    expect(own).toHaveLength(1);
    expect(monthTotals(own, '2026-10').get('MXN')).toBe(100);
    expect(visibleTickets(tickets, 456, undefined)).toHaveLength(1);
  });

  it('busca comercios sin distinguir acentos y permite buscar por mes', () => {
    const tickets = parseTickets([header, row('2026-10-20', 'Café Central', 'MXN', 100, 'OK', 123)]);
    expect(searchTickets(tickets, 'cafe')).toHaveLength(1);
    expect(searchTickets(tickets, '2026-10')).toHaveLength(1);
    expect(searchTickets(tickets, '2026-09')).toHaveLength(0);
  });

  it('rechaza una hoja con columnas cambiadas', () => {
    expect(() => parseTickets([['Comercio', 'Fecha']])).toThrow('encabezados inesperados');
  });
});
