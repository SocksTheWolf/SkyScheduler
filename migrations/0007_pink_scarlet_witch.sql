ALTER TABLE `posts` ADD `updated_at` integer;--> statement-breakpoint
CREATE INDEX `postedUpdate_idx` ON `posts` (`updated_at`,`posted`);--> statement-breakpoint
CREATE INDEX `repost_postid_idx` ON `reposts` (`post_uuid`);