-- Create the site_settings table
create table if not exists public.site_settings (
  id bigint primary key default 1,
  hero_bg_url text,
  hero_label text default 'The Journey of Us',
  hero_title text default 'Our Story',
  hero_subtext text default '"Every love story is beautiful, but ours is my favorite."',
  map_style text default 'mapbox://styles/mapbox/light-v11',
  constraint single_row check (id = 1)
);

-- Insert initial row if it doesn't exist
insert into public.site_settings (id, hero_bg_url, hero_label, hero_title, hero_subtext, map_style)
values (1, null, 'The Journey of Us', 'Our Story', '"Every love story is beautiful, but ours is my favorite."', 'mapbox://styles/mapbox/light-v11')
on conflict (id) do nothing;

-- Enable Row Level Security (RLS)
alter table public.site_settings enable row level security;

-- Policies for public reading and authenticated updating
create policy "Allow public read-only access to site_settings" 
on public.site_settings for select 
using (true);

create policy "Allow authenticated update access to site_settings" 
on public.site_settings for update 
using (true);
