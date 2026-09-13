CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`sequence` integer NOT NULL,
	`user_id` text NOT NULL,
	`mandi_id` text NOT NULL,
	`crop_id` text NOT NULL,
	`crop_name` text NOT NULL,
	`quantity_kg` real NOT NULL,
	`booking_date` text NOT NULL,
	`slot` integer NOT NULL,
	`status` text DEFAULT 'booked' NOT NULL,
	`weight_kg` real,
	`rate_paise` integer,
	`amount_paise` integer,
	`payment_reference` text,
	`checked_in_at` text,
	`called_at` text,
	`procured_at` text,
	`paid_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`operation_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`mandi_id`) REFERENCES `mandis`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`crop_id`) REFERENCES `crops`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_token_unique` ON `bookings` (`token`);--> statement-breakpoint
CREATE INDEX `idx_bookings_mandi_date_slot` ON `bookings` (`mandi_id`,`booking_date`,`slot`,`status`);--> statement-breakpoint
CREATE INDEX `idx_bookings_user_date` ON `bookings` (`user_id`,`booking_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_bookings_day_sequence` ON `bookings` (`mandi_id`,`booking_date`,`sequence`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_bookings_farmer_day` ON `bookings` (`user_id`,`booking_date`) WHERE "bookings"."status" <> 'cancelled';--> statement-breakpoint
CREATE UNIQUE INDEX `idx_bookings_active_crop` ON `bookings` (`crop_id`) WHERE "bookings"."status" <> 'cancelled';--> statement-breakpoint
CREATE TABLE `crops` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`variety` text NOT NULL,
	`quantity_kg` real NOT NULL,
	`season` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_crops_user` ON `crops` (`user_id`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`status` text NOT NULL,
	`note` text NOT NULL,
	`version` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_events_booking_version` ON `events` (`booking_id`,`version`);--> statement-breakpoint
CREATE TABLE `mandis` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`district` text NOT NULL,
	`address` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`capacity` integer NOT NULL,
	`service_minutes` integer NOT NULL,
	`desks` integer NOT NULL,
	`open_hour` integer NOT NULL,
	`close_hour` integer NOT NULL,
	`opening_days` text NOT NULL,
	`accepted_crops` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`booking_id` text,
	`status` text NOT NULL,
	`message` text NOT NULL,
	`read_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_user_created` ON `notifications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`village` text NOT NULL,
	`role` text DEFAULT 'farmer' NOT NULL,
	`mandi_id` text,
	`verified` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`mandi_id`) REFERENCES `mandis`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_users_mandi_verification` ON `users` (`mandi_id`,`verified`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_single_admin` ON `users` (`role`) WHERE "users"."role" = 'admin';