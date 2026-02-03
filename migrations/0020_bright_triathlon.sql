CREATE TABLE `repostCounts` (
	`post_uuid` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`post_uuid`) REFERENCES `posts`(`uuid`) ON UPDATE no action ON DELETE cascade
);
