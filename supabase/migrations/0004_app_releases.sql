create table if not exists app_releases (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  title text not null,
  notes text,
  released_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table app_releases enable row level security;

create policy "app_releases read" on app_releases for select using (true);
create policy "app_releases write" on app_releases for all using (my_role() in ('owner','admin'));

insert into app_releases (version, title, notes) values
  ('1.0.0', 'Initial Production Release', 'Full ERP launch with Interview Tracker, Offers, Masters, Reports, and PWA support.');
