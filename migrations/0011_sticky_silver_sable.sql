DROP INDEX `postNowScheduledDatePosted_idx`;--> statement-breakpoint
CREATE INDEX `postNowScheduledDatePosted_idx` ON `posts` (`posted`,`scheduled_date`,`postNow`) WHERE posted = 0 and postNow <> 1;