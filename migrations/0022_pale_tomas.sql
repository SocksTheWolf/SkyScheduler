ALTER TABLE `posts` ADD `repostInfo` text;--> statement-breakpoint
ALTER TABLE `reposts` ADD `schedule_guid` text;--> statement-breakpoint
CREATE INDEX `repost_scheduleGuid_idx` ON `reposts` (`schedule_guid`);