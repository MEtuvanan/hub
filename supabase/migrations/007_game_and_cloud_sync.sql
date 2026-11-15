-- 007_game_and_cloud_sync: columns for cloud synchronization of game state and character outfits

-- Add JSONB columns to profiles for outfit wardrobe and cloud save backup
alter table public.profiles add column if not exists outfit jsonb default '{}'::jsonb;
alter table public.profiles add column if not exists game_save jsonb default '{}'::jsonb;

-- Optional columns on characters table if used by admin/partner
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'characters') then
    alter table public.characters add column if not exists model_url text;
    alter table public.characters add column if not exists is_3d boolean default false;
  end if;
end $$;
