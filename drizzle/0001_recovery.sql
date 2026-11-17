ALTER TABLE workspace ADD COLUMN generation INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE workspace ADD COLUMN mutation TEXT;
