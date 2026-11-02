-- Stable pagination for the administrator and each ticket owner.
CREATE INDEX IF NOT EXISTS tickets_all_order ON tickets(created_at DESC,legacy_order DESC,id DESC);
CREATE INDEX IF NOT EXISTS tickets_chat_order ON tickets(chat_id,created_at DESC,legacy_order DESC,id DESC);
CREATE INDEX IF NOT EXISTS tickets_chat_receipt_date ON tickets(chat_id,json_extract(data,'$.fecha')) WHERE status!='Eliminado';
