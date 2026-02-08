CREATE TABLE `bans` (
	`account_did` text PRIMARY KEY NOT NULL,
	`banReason` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
