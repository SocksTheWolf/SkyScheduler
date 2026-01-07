PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_violations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user` text NOT NULL,
	`tosViolation` integer DEFAULT false,
	`userPassInvalid` integer DEFAULT false,
	`accountSuspended` integer DEFAULT false,
	`accountGone` integer DEFAULT false,
	`mediaTooBig` integer DEFAULT false,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_violations`("id", "user", "tosViolation", "userPassInvalid", "accountSuspended", "accountGone", "mediaTooBig", "created_at") SELECT "id", "user", "tosViolation", "userPassInvalid", "accountSuspended", "accountGone", "mediaTooBig", "created_at" FROM `violations`;--> statement-breakpoint
DROP TABLE `violations`;--> statement-breakpoint
ALTER TABLE `__new_violations` RENAME TO `violations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `violations_user_idx` ON `violations` (`user`);