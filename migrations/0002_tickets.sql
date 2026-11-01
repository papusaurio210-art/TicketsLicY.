CREATE TABLE IF NOT EXISTS tickets (
 id TEXT PRIMARY KEY, hash TEXT NOT NULL, chat_id TEXT NOT NULL, user_id TEXT NOT NULL,
 data TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('OK','Revisar','Eliminado')),
 image_key TEXT, mime TEXT, fingerprint TEXT,
 origin TEXT NOT NULL CHECK(origin IN ('native','legacy')),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 legacy_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS tickets_owner_date ON tickets(chat_id,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS tickets_active_hash ON tickets(chat_id,hash) WHERE status!='Eliminado';
CREATE UNIQUE INDEX IF NOT EXISTS tickets_active_fingerprint ON tickets(chat_id,fingerprint) WHERE status!='Eliminado' AND fingerprint IS NOT NULL;
CREATE TABLE IF NOT EXISTS daily_usage (chat_id TEXT NOT NULL, day TEXT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY(chat_id,day));
CREATE TABLE IF NOT EXISTS processed_updates (update_id INTEGER PRIMARY KEY, ticket_id TEXT NOT NULL REFERENCES tickets(id));
CREATE TABLE IF NOT EXISTS migration_issues (source_id TEXT PRIMARY KEY, reason TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS purged_tickets (id TEXT PRIMARY KEY, purged_at TEXT NOT NULL);
CREATE TRIGGER IF NOT EXISTS enforce_daily_ticket_limit BEFORE INSERT ON tickets WHEN NEW.origin='native'
BEGIN
 INSERT INTO daily_usage(chat_id,day,count) VALUES(NEW.chat_id,date('now'),1)
 ON CONFLICT(chat_id,day) DO UPDATE SET count=count+1;
 SELECT CASE WHEN (SELECT count FROM daily_usage WHERE chat_id=NEW.chat_id AND day=date('now'))>30 THEN RAISE(ABORT,'DAILY_TICKET_LIMIT') END;
END;
