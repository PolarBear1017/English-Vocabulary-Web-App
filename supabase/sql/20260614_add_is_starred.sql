-- Add is_starred tracking for user_library
alter table if exists user_library
  add column if not exists is_starred boolean default false;
