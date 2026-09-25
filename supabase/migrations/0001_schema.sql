-- ============================================================
-- MyMilestone ERP — Supabase schema (run in Supabase SQL editor, once)
-- Multi-tenant: every row belongs to a company. RLS enforces isolation.
-- ============================================================
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ---------- Tenancy & users ----------
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  tagline text,
  address text,
  whatsapp_hr text,               -- HR WhatsApp number, e.g. 918452845537
  offer_ref_prefix text default 'MC/OL',
  logo_url text,
  letterhead jsonb default '{}',  -- {header, footer, sign, stamp} storage paths
  settings jsonb default '{}',
  created_at timestamptz default now()
);

create type user_role as enum ('owner','admin','recruiter','hr','viewer');

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  full_name text,
  role user_role not null default 'recruiter',
  phone text,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  email text not null,
  role user_role not null default 'recruiter',
  token text unique default encode(gen_random_bytes(16),'hex'),
  accepted_at timestamptz,
  created_at timestamptz default now()
);

-- ---------- Masters (ERP level, one list per type) ----------
create table if not exists masters (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  type text not null,        -- Designation | Department | Project | Site | Reporting To | Place of Posting | Notice Period | Accommodation | Official Transportation | Food
  value text not null,
  detail text,
  sort_order int default 0,
  created_at timestamptz default now(),
  unique (company_id, type, value)
);

create table if not exists responsibilities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  designation text not null,
  title text,
  text text not null,
  sort_order int default 0
);

create table if not exists letter_texts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  key text not null,         -- SUBJECT | INTRO | JOINING | CONDITIONS | GENERAL | CLOSING | ACCEPTANCE
  title text not null,
  text text not null,
  updated_at timestamptz default now(),
  unique (company_id, key)
);

-- ---------- Candidates (the 21-column record) ----------
create type candidate_status as enum ('Pending Call','Pending','Hold','Selected','Rejected');

create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  interview_no int not null,                 -- sequential per company (Interview ID)
  interview_date date default current_date,
  candidate_name text,
  gender text,
  date_of_birth date,
  age int,
  mobile_no text,
  email text,
  address text,
  pincode text,
  position_applied_for text,
  education text,
  total_experience_years numeric,
  current_location text,
  current_salary text,
  expected_salary text,
  joining_availability text,
  final_status candidate_status default 'Pending Call',
  joining_date date,
  resume_path text,                          -- storage path in bucket 'resumes'
  remarks text,
  site text,
  ai_score int,
  ai_score_note text,
  documents jsonb default '[]',              -- checklist
  interview_event_url text,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (company_id, interview_no)
);
create index if not exists candidates_company_idx on candidates(company_id, created_at desc);
create index if not exists candidates_mobile_idx on candidates(company_id, mobile_no);

create table if not exists call_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  candidate_id uuid references candidates(id) on delete cascade,
  outcome text not null,                     -- Interested | Not interested | Call back | No answer | Interview scheduled | Note ...
  note text,
  next_follow_up date,
  logged_by uuid references profiles(id),
  created_at timestamptz default now()
);
create index if not exists call_logs_cand_idx on call_logs(candidate_id, created_at desc);

-- ---------- Offer letters with versions ----------
create type offer_status as enum ('Issued','Accepted','Declined','Expired','Withdrawn');

create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  candidate_id uuid references candidates(id) on delete cascade,
  base_ref text not null,                    -- MC/OL/2026/001
  version int not null default 1,
  ref_no text not null,                      -- MC/OL/2026/001 or MC/OL/2026/001-v2
  is_active boolean default true,            -- exactly one active per base_ref
  designation text,
  salary text,
  letter_date date,
  joining_date date,
  accept_by date,
  status offer_status default 'Issued',
  accepted_on date,
  pdf_path text,                             -- storage bucket 'offers'
  payload jsonb default '{}',                -- full form inputs for re-edit
  note text,
  issued_by uuid references profiles(id),
  created_at timestamptz default now(),
  unique (company_id, ref_no)
);

-- ---------- Audit & Trash ----------
create table if not exists audit_log (
  id bigserial primary key,
  company_id uuid references companies(id) on delete cascade,
  actor uuid references profiles(id),
  action text not null,
  entity text,
  entity_id text,
  details text,
  created_at timestamptz default now()
);

create table if not exists trash (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  type text not null,                        -- Candidate | Offer | Master
  key text,
  label text,
  details text,
  payload jsonb not null,
  reason text,
  deleted_by uuid references profiles(id),
  deleted_at timestamptz default now()
);

-- ---------- Sequences per company ----------
create table if not exists counters (
  company_id uuid references companies(id) on delete cascade,
  name text not null,                        -- 'interview' | 'offer:2026'
  value int not null default 0,
  primary key (company_id, name)
);

create or replace function next_counter(p_company uuid, p_name text) returns int language plpgsql as $$
declare v int;
begin
  insert into counters(company_id,name,value) values (p_company,p_name,1)
  on conflict (company_id,name) do update set value = counters.value + 1
  returning value into v;
  return v;
end $$;

-- ---------- Helpers ----------
create or replace function my_company() returns uuid language sql stable as $$
  select company_id from profiles where id = auth.uid()
$$;
create or replace function my_role() returns user_role language sql stable as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists candidates_touch on candidates;
create trigger candidates_touch before update on candidates for each row execute function touch_updated_at();

-- ---------- RLS ----------
alter table companies enable row level security;
alter table profiles enable row level security;
alter table invites enable row level security;
alter table masters enable row level security;
alter table responsibilities enable row level security;
alter table letter_texts enable row level security;
alter table candidates enable row level security;
alter table call_logs enable row level security;
alter table offers enable row level security;
alter table audit_log enable row level security;
alter table trash enable row level security;
alter table counters enable row level security;

create policy "own company read" on companies for select using (id = my_company());
create policy "owner/admin update company" on companies for update using (id = my_company() and my_role() in ('owner','admin'));

create policy "profiles same company" on profiles for select using (company_id = my_company() or id = auth.uid());
create policy "profile self update" on profiles for update using (id = auth.uid());
create policy "admin manage profiles" on profiles for all using (company_id = my_company() and my_role() in ('owner','admin'));

create policy "invites admin" on invites for all using (company_id = my_company() and my_role() in ('owner','admin'));

-- masters: everyone in company reads; only owner/admin write (this replaces the old master PIN)
create policy "masters read" on masters for select using (company_id = my_company());
create policy "masters write" on masters for all using (company_id = my_company() and my_role() in ('owner','admin'));
create policy "resp read" on responsibilities for select using (company_id = my_company());
create policy "resp write" on responsibilities for all using (company_id = my_company() and my_role() in ('owner','admin'));
create policy "letter read" on letter_texts for select using (company_id = my_company());
create policy "letter write" on letter_texts for all using (company_id = my_company() and my_role() in ('owner','admin'));

create policy "cand rw" on candidates for all using (company_id = my_company() and my_role() <> 'viewer');
create policy "cand read viewer" on candidates for select using (company_id = my_company());
create policy "calls rw" on call_logs for all using (company_id = my_company() and my_role() <> 'viewer');
create policy "calls read" on call_logs for select using (company_id = my_company());
create policy "offers rw" on offers for all using (company_id = my_company() and my_role() <> 'viewer');
create policy "offers read" on offers for select using (company_id = my_company());
create policy "audit read" on audit_log for select using (company_id = my_company());
create policy "audit insert" on audit_log for insert with check (company_id = my_company());
create policy "trash read" on trash for select using (company_id = my_company());
create policy "trash write" on trash for all using (company_id = my_company() and my_role() in ('owner','admin','recruiter','hr'));
create policy "counters rw" on counters for all using (company_id = my_company());

-- ---------- New user bootstrap: first user creates a company and becomes owner ----------
create or replace function handle_new_user() returns trigger language plpgsql security definer as $$
declare cid uuid; inv record;
begin
  select * into inv from invites where email = new.email and accepted_at is null limit 1;
  if found then
    insert into profiles(id, company_id, full_name, role) values (new.id, inv.company_id, coalesce(new.raw_user_meta_data->>'full_name', new.email), inv.role);
    update invites set accepted_at = now() where id = inv.id;
  else
    insert into companies(name, legal_name) values (coalesce(new.raw_user_meta_data->>'company_name','My Company'), coalesce(new.raw_user_meta_data->>'company_name','My Company')) returning id into cid;
    insert into profiles(id, company_id, full_name, role) values (new.id, cid, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'owner');
    -- seed masters + letter texts for the new company
    insert into masters(company_id,type,value) values
      (cid,'Designation','Sr Engineer'),(cid,'Designation','Site Engineer'),(cid,'Designation','Site Supervisor'),(cid,'Designation','Project Manager'),(cid,'Designation','Accountant'),
      (cid,'Department','Projects'),(cid,'Department','Accounts'),(cid,'Department','HR & Admin'),(cid,'Department','Purchase'),
      (cid,'Project','Nashik Project'),(cid,'Site','Nashik'),(cid,'Site','Head Office'),
      (cid,'Reporting To','Project Manager'),(cid,'Reporting To','Site In-charge'),(cid,'Reporting To','Managing Director'),
      (cid,'Place of Posting','Assigned project site / location as communicated by the Company.'),
      (cid,'Notice Period','one (1) month'),(cid,'Notice Period','fifteen (15) days'),(cid,'Notice Period','two (2) months'),
      (cid,'Accommodation','Bachelor accommodation will be provided by the Company on a sharing basis during the period of assignment.'),
      (cid,'Official Transportation','A vehicle will be provided by the Company for official travel between the provided accommodation and assigned project/site/work location, as required for official duties.'),
      (cid,'Food','Food expenses are included in the above salary. The Company will not provide any separate food or mess facility, and the employee shall arrange their own food.');
    insert into responsibilities(company_id,designation,title,text,sort_order) values
      (cid,'Sr Engineer','Site Execution & Supervision','Plan, supervise, and monitor day-to-day construction activities as per drawings, specifications, and project schedules.',1),
      (cid,'Sr Engineer','Quantity & Billing','Prepare and verify measurements, BOQs, RA Bills, and contractor/subcontractor bills.',2),
      (cid,'Sr Engineer','Quality & Safety','Ensure work quality, material compliance, and adherence to safety standards at site.',3),
      (cid,'Sr Engineer','Manpower & Machinery Management','Coordinate labour, subcontractors, materials, and machinery for smooth project execution.',4),
      (cid,'Sr Engineer','Progress & Reporting','Track project progress, identify delays/issues, coordinate with HO/consultants, and submit daily/weekly progress reports.',5);
    insert into letter_texts(company_id,key,title,text) values
      (cid,'SUBJECT','Subject line','Subject: Offer of Appointment – {{DESIGNATION}}'),
      (cid,'INTRO','Opening paragraph','We are pleased to offer you the position of {{DESIGNATION}} with {{COMPANY}}, as discussed during your interview. Based on your qualifications, experience and suitability for the assigned project requirements, we are confident that you will contribute effectively to the project team.'),
      (cid,'JOINING','4. Joining Date & Acceptance','Your date of joining shall be {{JOINING_DATE}}. You are required to report for duty and join the Company on or before {{JOINING_DATE}}. Failure to join within the stipulated date may result in withdrawal of this offer. To confirm your acceptance, please sign and return one copy of this letter to the Company on or before {{ACCEPT_BY}}.'),
      (cid,'CONDITIONS','5. Employment Conditions','Your appointment shall be subject to verification of the information and documents provided by you, compliance with Company policies, and satisfactory performance. Upon acceptance of this offer, you are expected to join on the agreed Date of Joining. After joining, a {{NOTICE_PERIOD}} notice period shall apply for resignation. Any early release or waiver of notice shall be subject to the Company''s written approval and applicable Company policy.'),
      (cid,'GENERAL','6. General','You are expected to maintain professional conduct, confidentiality of project information and records, and comply with all applicable project safety, quality and administrative requirements.'),
      (cid,'CLOSING','Closing line','We look forward to welcoming you to {{COMPANY}} and wish you a successful association with the Company.'),
      (cid,'ACCEPTANCE','Acceptance by employee','I, {{NAME}}, hereby accept the above offer and agree to join {{COMPANY}} on {{JOINING_DATE}} on the terms stated above.');
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- ---------- Storage buckets (private) ----------
insert into storage.buckets (id, name, public) values ('resumes','resumes',false) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('offers','offers',false) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('letterhead','letterhead',false) on conflict do nothing;
-- object path convention: <company_id>/<file>  → policies check first folder = my_company()
create policy "company files read" on storage.objects for select using (bucket_id in ('resumes','offers','letterhead') and (storage.foldername(name))[1] = my_company()::text);
create policy "company files write" on storage.objects for insert with check (bucket_id in ('resumes','offers','letterhead') and (storage.foldername(name))[1] = my_company()::text);
create policy "company files update" on storage.objects for update using (bucket_id in ('resumes','offers','letterhead') and (storage.foldername(name))[1] = my_company()::text);
create policy "company files delete" on storage.objects for delete using (bucket_id in ('resumes','offers','letterhead') and (storage.foldername(name))[1] = my_company()::text);

-- ---------- Realtime ----------
alter publication supabase_realtime add table candidates, call_logs, offers, masters, responsibilities, letter_texts, trash;
