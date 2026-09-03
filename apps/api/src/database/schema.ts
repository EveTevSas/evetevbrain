import {
  bigint,
  integer,
  boolean,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";

// Schemas (espejo de supabase/migrations/0001_init_evepay.sql).
export const identity = pgSchema("identity");
export const evepay = pgSchema("evepay");

export const tenants = identity.table("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  legalName: text("legal_name").notNull(),
  displayName: text("display_name").notNull(),
  status: text("status").notNull().default("activo"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const merchants = evepay.table("merchants", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  legalName: text("legal_name").notNull(),
  provider: text("provider").notNull().default("akua"),
  providerMerchantId: text("provider_merchant_id"),
  status: text("status").notNull().default("pendiente"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const payments = evepay.table("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  merchantId: uuid("merchant_id").notNull(),
  amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
  currency: text("currency").notNull(),
  reference: text("reference").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pendiente"),
  provider: text("provider").notNull().default("akua"),
  providerPaymentId: text("provider_payment_id"),
  checkoutUrl: text("checkout_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const paymentIdempotency = evepay.table(
  "payment_idempotency",
  {
    tenantId: uuid("tenant_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    paymentId: uuid("payment_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.idempotencyKey] })]
);

export const paymentAudit = evepay.table("payment_audit", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  paymentId: uuid("payment_id").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  actor: text("actor").notNull(),
  data: jsonb("data"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow()
});

export const webhookEvents = evepay.table("webhook_events", {
  eventId: text("event_id").primaryKey(),
  tenantId: uuid("tenant_id").notNull(),
  provider: text("provider").notNull().default("akua"),
  type: text("type").notNull(),
  /** Cobro al que se refiere; null en los eventos anteriores a 0010. */
  paymentId: uuid("payment_id"),
  /** Cuántas veces llegó este mismo evento (los reenvíos no se aplican). */
  recibidoVeces: integer("recibido_veces").notNull().default(1),
  ultimoEn: timestamp("ultimo_en", { withTimezone: true }),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow()
});

export const ledgerEntries = evepay.table("ledger_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  paymentId: uuid("payment_id"),
  kind: text("kind").notNull(),
  memo: text("memo").notNull().default(""),
  postedAt: timestamp("posted_at", { withTimezone: true }).notNull().defaultNow()
});

export const ledgerLines = evepay.table("ledger_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  entryId: uuid("entry_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  account: text("account").notNull(),
  direction: text("direction").notNull(),
  amountMinor: bigint("amount_minor", { mode: "number" }).notNull()
});

export const merchantApiKeys = identity.table("merchant_api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(),
  environment: text("environment").notNull().default("live"),
  label: text("label"),
  activa: boolean("activa").notNull().default(true),
  creadaEn: timestamp("creada_en", { withTimezone: true }).notNull().defaultNow()
});

export const merchantWebhooks = evepay.table("merchant_webhooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  url: text("url").notNull(),
  secret: text("secret").notNull(),
  events: text("events").array().notNull().default(["payment.completed", "payment.failed"]),
  activa: boolean("activa").notNull().default(true),
  creadaEn: timestamp("creada_en", { withTimezone: true }).notNull().defaultNow()
});

export const schema = {
  tenants,
  merchantApiKeys,
  merchants,
  payments,
  paymentIdempotency,
  paymentAudit,
  webhookEvents,
  ledgerEntries,
  ledgerLines,
  merchantWebhooks
};
