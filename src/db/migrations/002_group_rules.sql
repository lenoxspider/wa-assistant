-- Migration 002: Add group chat reply rules columns
ALTER TABLE rules ADD COLUMN respondInGroups BOOLEAN DEFAULT 0;
ALTER TABLE rules ADD COLUMN groupReplyMode TEXT DEFAULT 'never';
