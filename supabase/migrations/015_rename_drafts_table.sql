-- "bot_drafts" predates the manual-only workflow and no longer
-- reflects what this table is - every row in it comes from the
-- Create Post form now. Rename it (and its indexes) to just "drafts".
alter table bot_drafts rename to drafts;

alter index if exists bot_drafts_status_idx rename to drafts_status_idx;
alter index if exists bot_drafts_source_url_idx rename to drafts_source_url_idx;
alter index if exists bot_drafts_draft_type_idx rename to drafts_draft_type_idx;
