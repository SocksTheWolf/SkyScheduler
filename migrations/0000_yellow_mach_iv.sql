CREATE TABLE `posts` (
	`uuid` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`scheduled_date` integer NOT NULL,
	`posted` integer DEFAULT false,
	`embedContent` text DEFAULT (json_array()) NOT NULL,
	`uri` text,
	`cid` text,
	`contentLabel` text DEFAULT 'None' NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`userid` text
);
--> statement-breakpoint
CREATE INDEX `scheduledDate_idx` ON `posts` (`scheduled_date`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `posts` (`userid`);