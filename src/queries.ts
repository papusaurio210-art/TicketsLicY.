export interface SheetTicket {
  row: number;
  fecha: string;
  comercio: string;
  folio: string;
  moneda: string;
  total: number;
  categoria: string;
  estado: string;
  userId: number;
  operationId: string;
}

const expectedHeaders = ['Fecha captura', 'Fecha ticket', 'Comercio', 'RFC', 'Folio', 'Moneda', 'Subtotal', 'IVA', 'Propina', 'Total', 'Método de pago', 'Categoría', 'Confianza', 'Estado', 'Link Drive', 'Quién lo envió', 'ID de operación', 'Hash'];

export function parseTickets(values: unknown[][]): SheetTicket[] {
  if (JSON.stringify(values[0]) !== JSON.stringify(expectedHeaders)) throw new Error('La hoja Tickets tiene encabezados inesperados');
  return values.slice(1).flatMap((cells, index) => {
    const total = Number(cells[9]);
    const userId = Number(cells[15]);
    if (!cells[9] && cells[9] !== 0 || !Number.isFinite(total) || !Number.isSafeInteger(userId)) return [];
    return [{ row: index + 2, fecha: String(cells[1] ?? ''), comercio: String(cells[2] ?? ''), folio: String(cells[4] ?? ''),
      moneda: String(cells[5] ?? ''), total, categoria: String(cells[11] ?? ''), estado: String(cells[13] ?? ''),
      userId, operationId: String(cells[16] ?? '') }];
  });
}

export function visibleTickets(tickets: SheetTicket[], userId: number, scope: string | undefined): SheetTicket[] {
  return tickets.filter(ticket => ticket.estado !== 'Eliminado' && (scope === 'all' || ticket.userId === userId));
}

function normalized(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
}

export function searchTickets(tickets: SheetTicket[], term: string): SheetTicket[] {
  const query = normalized(term.trim());
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(query)) return tickets.filter(ticket => ticket.fecha.startsWith(query));
  return tickets.filter(ticket => [ticket.comercio, ticket.folio, ticket.categoria].some(value => normalized(value).includes(query)));
}

export function ticketLine(ticket: SheetTicket): string {
  return `${ticket.fecha} · ${ticket.comercio} · ${ticket.total.toFixed(2)} ${ticket.moneda} · ${ticket.categoria} (${ticket.operationId})`;
}

export function monthTotals(tickets: SheetTicket[], month: string): Map<string, number> {
  const totals = new Map<string, number>();
  for (const ticket of tickets.filter(item => item.fecha.startsWith(month))) {
    totals.set(ticket.moneda, (totals.get(ticket.moneda) ?? 0) + ticket.total);
  }
  return totals;
}
