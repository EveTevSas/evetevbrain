import { bigint, jsonb, pgSchema, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

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

export const schema = {
  tenants,
  merchants,
  payments,
  paymentIdempotency,
  paymentAudit
};
