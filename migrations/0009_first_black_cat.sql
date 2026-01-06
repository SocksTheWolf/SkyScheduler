DROP INDEX `postedUpdate_idx`;--> statement-breakpoint
CREATE INDEX `postNowScheduledDatePosted_idx` ON `posts` (`posted`,`scheduled_date`,`postNow`) WHERE posted = 0 and postNow <> 0;--> statement-breakpoint
CREATE INDEX `postedUpdate_idx` ON `posts` (`updated_at`,`posted`) WHERE posted = 1;