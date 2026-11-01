export interface TicketRecord {
  createdAt: string;
  imageAvailable: boolean;
  origin: 'native' | 'legacy';
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

export function visibleTickets(
  tickets: TicketRecord[],
  userId: number,
  scope: string | undefined,
): TicketRecord[] {
  return tickets.filter(
    (ticket) => ticket.estado !== 'Eliminado' && (scope === 'all' || ticket.userId === userId),
  );
}

function normalized(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();
}

export function searchTickets(tickets: TicketRecord[], term: string): TicketRecord[] {
  const query = normalized(term.trim());
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(query))
    return tickets.filter((ticket) => ticket.fecha.startsWith(query));
  return tickets.filter((ticket) =>
    [ticket.comercio, ticket.folio, ticket.categoria].some((value) =>
      normalized(value).includes(query),
    ),
  );
}

export function ticketLine(ticket: TicketRecord): string {
  return `${ticket.fecha} · ${ticket.comercio} · ${ticket.total.toFixed(2)} ${ticket.moneda} · ${ticket.categoria} (${ticket.operationId})`;
}

export function monthTotals(tickets: TicketRecord[], month: string): Map<string, number> {
  const totals = new Map<string, number>();
  for (const ticket of tickets.filter((item) => item.fecha.startsWith(month))) {
    totals.set(ticket.moneda, (totals.get(ticket.moneda) ?? 0) + ticket.total);
  }
  return totals;
}
