ALTER TABLE `posts` ADD `rootPost` text;--> statement-breakpoint
ALTER TABLE `posts` ADD `parentPost` text;--> statement-breakpoint
ALTER TABLE `posts` ADD `threadOrder` integer DEFAULT -1;--> statement-breakpoint
CREATE INDEX `generalThread_idx` ON `posts` (`parentPost`,`rootPost`) WHERE parentPost is not NULL;--> statement-breakpoint
CREATE INDEX `threadOrder_idx` ON `posts` (`rootPost`,`threadOrder`) WHERE threadOrder >= 0;