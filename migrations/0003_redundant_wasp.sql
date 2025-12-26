CREATE TABLE `violations` (
	`user` text PRIMARY KEY NOT NULL,
	`tos` integer DEFAULT false,
	`invalidPW` integer DEFAULT false,
	`accountSuspended` integer DEFAULT false,
	`accountGone` integer DEFAULT false,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `violations_user_idx` ON `violations` (`user`);