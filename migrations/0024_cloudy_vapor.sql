DROP INDEX `repost_scheduleGuid_idx`;--> statement-breakpoint
CREATE INDEX `repost_scheduleGuid_idx` ON `reposts` (`schedule_guid`,`post_uuid`);