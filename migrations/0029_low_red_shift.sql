DROP INDEX `rootPostedUUID_idx`;--> statement-breakpoint
CREATE INDEX `rootPostedUUID_idx` ON `posts` (`rootPost`,`posted`) WHERE rootPost is not NULL and posted = 1;