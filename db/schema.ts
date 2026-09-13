import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const mandis = sqliteTable("mandis", {
  id: text("id").primaryKey(), name: text("name").notNull(), district: text("district").notNull(),
  address: text("address").notNull(), latitude: real("latitude").notNull(), longitude: real("longitude").notNull(),
  capacity: integer("capacity").notNull(), serviceMinutes: integer("service_minutes").notNull(), desks: integer("desks").notNull(),
  openHour: integer("open_hour").notNull(), closeHour: integer("close_hour").notNull(),
  openingDays: text("opening_days").notNull(), acceptedCrops: text("accepted_crops").notNull(),
  active: integer("active").notNull().default(1), createdAt: text("created_at").notNull(),
});
export const users = sqliteTable("users", {
  id: text("id").primaryKey(), email: text("email").notNull(), name: text("name").notNull(),
  phone: text("phone").notNull(), village: text("village").notNull(),
  role: text("role").notNull().default("farmer"), mandiId: text("mandi_id").references(()=>mandis.id),
  verified: integer("verified").notNull().default(0), createdAt: text("created_at").notNull(),
}, t=>[index("idx_users_mandi_verification").on(t.mandiId,t.verified),uniqueIndex("idx_users_single_admin").on(t.role).where(sql`${t.role} = 'admin'`)]);
export const crops = sqliteTable("crops", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(()=>users.id),
  name: text("name").notNull(), variety: text("variety").notNull(), quantityKg: real("quantity_kg").notNull(),
  season: text("season").notNull(), createdAt: text("created_at").notNull(),
},t=>[index("idx_crops_user").on(t.userId)]);
export const bookings = sqliteTable("bookings", {
  id: text("id").primaryKey(), token: text("token").notNull().unique(), sequence: integer("sequence").notNull(),
  userId: text("user_id").notNull().references(()=>users.id), mandiId: text("mandi_id").notNull().references(()=>mandis.id),
  cropId: text("crop_id").notNull().references(()=>crops.id), cropName: text("crop_name").notNull(),
  quantityKg: real("quantity_kg").notNull(), bookingDate: text("booking_date").notNull(), slot: integer("slot").notNull(),
  status: text("status").notNull().default("booked"), weightKg: real("weight_kg"), ratePaise: integer("rate_paise"), amountPaise: integer("amount_paise"),
  paymentReference: text("payment_reference"), checkedInAt: text("checked_in_at"), calledAt: text("called_at"),
  procuredAt: text("procured_at"), paidAt: text("paid_at"), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
  version: integer("version").notNull().default(0), operationId: text("operation_id"),
},t=>[
  index("idx_bookings_mandi_date_slot").on(t.mandiId,t.bookingDate,t.slot,t.status),
  index("idx_bookings_user_date").on(t.userId,t.bookingDate),
  uniqueIndex("idx_bookings_day_sequence").on(t.mandiId,t.bookingDate,t.sequence),
  uniqueIndex("idx_bookings_farmer_day").on(t.userId,t.bookingDate).where(sql`${t.status} <> 'cancelled'`),
  uniqueIndex("idx_bookings_active_crop").on(t.cropId).where(sql`${t.status} <> 'cancelled'`),
]);
export const events = sqliteTable("events", {
  id: text("id").primaryKey(), bookingId: text("booking_id").notNull().references(()=>bookings.id),
  actorId: text("actor_id").notNull().references(()=>users.id), status: text("status").notNull(),
  note: text("note").notNull(), version: integer("version").notNull(), createdAt: text("created_at").notNull(),
},t=>[uniqueIndex("idx_events_booking_version").on(t.bookingId,t.version)]);
export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(()=>users.id),
  bookingId: text("booking_id").references(()=>bookings.id), status: text("status").notNull(),
  message: text("message").notNull(), readAt: text("read_at"), createdAt: text("created_at").notNull(),
},t=>[index("idx_notifications_user_created").on(t.userId,t.createdAt)]);
