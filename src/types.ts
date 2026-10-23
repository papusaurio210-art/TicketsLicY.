export interface Env {
  STATE: KVNamespace;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
  ALLOWED_CHAT_IDS: string;
  OPENAI_API_KEY: string;
  OPENAI_MODEL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REFRESH_TOKEN: string;
  GOOGLE_FOLDER_ID: string;
  GOOGLE_SHEET_ID: string;
  GOOGLE_TRASH_FOLDER_ID: string;
  QUERY_SCOPE?: string;
}

export interface Ticket {
  comercio: string;
  rfc_emisor: string | null;
  fecha: string;
  hora: string | null;
  folio: string | null;
  moneda: string;
  subtotal: number | null;
  iva: number | null;
  propina: number | null;
  total: number | null;
  metodo_pago: string | null;
  ultimos_4_tarjeta: string | null;
  categoria: 'Alimentos' | 'Transporte' | 'Hospedaje' | 'Insumos' | 'Servicios' | 'Otros';
  confianza: number;
  notas: string | null;
}

export interface Operation {
  id: string;
  hash: string;
  chatId: number;
  userId: number;
  fileId: string;
  row: number;
  ticket: Ticket;
  status: 'OK' | 'Revisar' | 'Eliminado';
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number };
    from?: { id: number };
    photo?: Array<{ file_id: string; file_size?: number }>;
    text?: string;
  };
  callback_query?: {
    id: string;
    from: { id: number };
    data?: string;
    message?: { chat: { id: number }; message_id: number };
  };
}
