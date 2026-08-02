const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync(
  "c:/Users/canis/Desktop/web-project/kini-int-operation-portal/data/product-all-log.db",
);
db.exec(`
  CREATE TABLE IF NOT EXISTS amendment_alert_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS pending_amendment_alerts (
    product_offering_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    listed INTEGER NOT NULL DEFAULT 0,
    unlisted INTEGER NOT NULL DEFAULT 1,
    label TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);
db.prepare(
  `INSERT INTO amendment_alert_meta (key, value) VALUES (?, ?)
   ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
).run("ack_max_audit_id", "0");
db.prepare(
  `INSERT INTO amendment_alert_meta (key, value) VALUES (?, ?)
   ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
).run("pending_shown_at", "");
db.prepare("DELETE FROM pending_amendment_alerts").run();
console.log("ack reset ok", db.prepare("SELECT * FROM amendment_alert_meta").all());
