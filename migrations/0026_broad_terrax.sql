DROP INDEX `threadOrder_idx`;--> statement-breakpoint
CREATE INDEX `threadOrder_idx` ON `posts` (`rootPost`,`threadOrder`) WHERE threadOrder <> -1;