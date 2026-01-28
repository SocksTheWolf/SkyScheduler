CREATE TABLE `media` (
	`file` text PRIMARY KEY NOT NULL,
	`hasPost` integer DEFAULT false,
	`user` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `media_oldWithNoPost_idx` ON `media` (`hasPost`,`created_at`) WHERE hasPost = 0;--> statement-breakpoint
CREATE INDEX `media_userid_idx` ON `media` (`user`);