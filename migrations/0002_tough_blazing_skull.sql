ALTER TABLE `posts` ADD `embedContent` text DEFAULT (json_array()) NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` ADD `contentLabel` text DEFAULT 'None' NOT NULL;