<USER_REQUEST>
# MASTER PROMPT — MyMilestone ERP (Next.js + Supabase + Vercel)

You have full permission to run all commands without asking. Work inside the currently open
folder `mymilestone` (git remote: https://github.com/milestoneconsultancy/mymilestone).
Build EXACTLY what is specified below. Do not invent extra features, do not skip listed ones,
do not change names. When something is ambiguous, choose the simplest option and continue.
Commit after every completed section with a clear message and push to `main`.

## 0. Stack & setup
- Next.js 15 (App Router, TypeScript), Tailwind CSS, shadcn/ui, lucide-react icons.
- Supabase: `@supabase/supabase-js` + `@supabase/ssr`. Auth (email+password and Google), Postgres, Storage, Realtime.
- PWA: `next-pwa` (or `@ducanh2912/next-pwa`) with manifest, installable, offline shell, and a **Web Share Target** (`share_target` in manifest, POST to `/api/share`) so a PDF/image shared from WhatsApp opens New interview with the file.
- Gemini: `@google/generative-ai` called ONLY from server routes. Model chain with fallback: `gemini-3.1-flash-lite` → `gemini-3.5-flash` → `gemini-3.8-flash` → `gemini-2.5-flash`; retry once on 429/503; total budget 45 s.
- PDF: `pdf-lib` (server route) for offer letters; `pdfjs-dist` in the browser to extract resume text (fast path).
- Env vars (create `.env.local` and list them in `.env.example`; ask me to put the same in Vercel):
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://zvwyljkeltedtpdonlip.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_55A9upvydG91lmuiyAS5hg_ea-8D9R9
  SUPABASE_SERVICE_ROLE_KEY=            # I will paste this myself, never commit it
  GEMINI_API_KEY=                       # I will paste
  NEXT_PUBLIC_APP_NAME=Milestone ERP
  ```
- Database: the file `supabase/migrations/0001_schema.sql` (I am giving it to you — copy it into the repo unchanged). Tell me to run it in Supabase → SQL Editor. Do not modify the schema; if you need a column, add a NEW migration file `0002_*.sql` and tell me to run it.
- Brand: navy `#0A2E5A` (primary, sidebar, app bar), orange `#F5741A` (accent/buttons), blue `#1B8BD8`. Fonts: Inter (body), display weight 700. Rounded 14–20px cards, soft shadows, light gray page background `#F3F5F9`. Sentence case everywhere.

## 1. Auth & tenancy
- `/login` (email/password + "Continue with Google"), `/signup` (full name, company name, email, password). Signup creates company + owner profile via the DB trigger — do not create them from the client.
- `/invite/[token]` accepts an invite; owner/admin can invite users from Settings → Team (email + role).
- Roles: owner, admin, recruiter, hr, viewer. Masters and Settings editable only by owner/admin (RLS enforces; UI hides).
- Every query must go through the Supabase client with RLS — never use the service role key in the browser. Server routes that need service role (Gemini, PDF generation, share endpoint) verify the user session first.
- Middleware: unauthenticated → `/login`. After login → `/` (ERP home).

## 2. App shell (this is the layout of the current app — replicate)
- **Desktop (≥1024px):** left navy sidebar 250px with logo + company name; content area; top bar with global search box, home button, live-sync dot.
- **Mobile:** top app bar with ☰ (drawer), logo, 🔍 search; bottom nav inside a module (Home · Candidates · New (centre orange) · Follow-ups · More → Offers/Master/Reports/Trash).
- **ERP home `/`**: navy hero band (greeting, date, "N calls waiting today · N offers awaiting acceptance"), 4 KPI cards (Candidates + this week, Calls due today, Offers open, Selected this month), quick actions (New interview, Issue offer letter, Follow-ups, Master), two columns: Today's calls (follow-ups due) + Recent activity (calls/offers merged timeline), then module tiles (desktop only): Interview tracker (Live), Master (ERP).
- Sidebar on ERP home shows: ERP home · Modules: Interview tracker · ERP: Master, Reports, Trash (with trash count badge). Inside Interview tracker sidebar shows "← ERP home" then Home, Candidates, New, Follow-ups, Offers, Master, Reports. Mobile drawer shows only: ERP home, Interview tracker, Master, Reports, Trash.
- **Live sync:** Supabase Realtime subscriptions on candidates, call_logs, offers, masters, trash → lists update automatically. Also refetch on `visibilitychange`/`online`. No manual refresh button on mobile.
- **Loaders:** branded splash on first load (navy, logo, orange progress), thin orange top progress bar for every in-flight request, spinners on buttons while saving, skeleton cards while lists load. Never a blank screen.
- **Global search** (full-screen on mobile): searches candidates (name, mobile, position, location, email, #ID), offers (ref, name, designation), masters (any value → opens that master tab), call notes. Highlight matches. Close with ✕, Escape, Android back.

## 3. Interview tracker module (`/tracker/...`)
### 3.1 New interview (`/tracker/new`)
- Upload zone: drag & drop / choose file (PDF, JPG, PNG, WEBP) / **From WhatsApp** button (opens picker + hint) / **Scan with camera** (mobile). Also receives files from the PWA share target.
- Flow: read file → if PDF, extract text in browser with pdfjs (8 s timeout) → instant regex prefill (mobile, email, pincode, DOB) → POST `/api/ai/resume` (text mode) → Gemini fills AI fields. If no text (scanned/photo) → POST file to `/api/ai/resume-file` (multimodal).
- Server validates AI output against text (mobile/email/pincode must appear in text, else use regex value). If all models fail: return regex fields with `aiOk:false`; UI shows "AI busy — basic details filled" + **Retry AI** button; auto-retry after 8 s if user hasn't typed in AI fields.
- Form (EXACT 21 fields, same names): Interview ID (auto, per company), Interview Date, Candidate Name, Gender, Date of Birth, Age (auto from DOB), Mobile No., Email, Address, Pincode, Position Applied For (dropdown from Designation master), Education / Qualification, Total Experience (Years), Current Location, Current Salary, Expected Salary, Joining Availability, Final Status (segmented: Pending Call | Pending | Hold | Selected | Rejected), Joining Date, Resume (uploaded), Remarks. Plus Site (dropdown from Site master).
- Under Mobile No.: **Call** (tel:) and **WhatsApp** (wa.me with Marathi greeting "Namaskar {first name}, {company} HR kadun bolat aahe. Tumcha resume milala. Bolayla sandhi milel ka?") buttons appear when a 10-digit number is present.
- Duplicate check: while typing mobile/email and before save, show "Possible duplicate: #ID name" with open button; server also checks.
- Buttons: **Save Draft** (status Pending Call, uploads resume to bucket `resumes/<company_id>/<uuid>.pdf`), **Update Draft**, **Submit Final**. Nothing is stored until Save. Unsaved-changes guard.
### 3.2 Candidates (`/tracker/candidates`)
- Mobile: cards; desktop: table (ID, name, mobile, position, site, date, status, Offer, AI score, last call). Filters: status chips with counts (+ "Offer issued"), position, site; search; sort.
- **Select mode** (button top-right): checkboxes, "Select all", bottom bar "N selected · Delete · Cancel". Delete asks reason and confirms; moves to Trash.
- Offer badge on every card/row: "Offer Issued/Accepted/…" of the active version.
- Profile sheet (bottom sheet on mobile, centred modal on desktop) with tabs: Details, Calls (log call: outcome, note, next follow-up date; schedule interview → Google Calendar link), Documents checklist, AI fit score (requirement text → score 1–10 + reasons), Offer (active + versions). Footer: Close · Delete · Edit.
- WhatsApp share to HR (summary) and 5 Marathi candidate templates (interview call, shortlisted, hold, rejected, joining reminder).
### 3.3 Follow-ups (`/tracker/followups`)
- Overdue / Today / Upcoming groups from `call_logs.next_follow_up`; each row: call, WhatsApp, log call.
### 3.4 Offers (`/tracker/offers`) — tabs: Issue offer letter · Issued offers
- Issue: 4 steps in one page — (1) letter date + candidate (contact/status auto) (2) designation ▼ → responsibilities auto (from responsibilities master), reporting to ▼, project ▼, place of posting ▼, notice period ▼ (3) joining date + salary; accept-by auto = joining (editable) (4) Accommodation / Official Transportation / Food: checkbox lists of master points (all ticked by default) + extra rows "Label | text".
- **Generate → Preview** (full 2-page letter rendered in the page, letterhead images) → **Submit & create PDF** → server builds PDF with `pdf-lib`: A4 portrait, Cambria/serif 11pt, black text, bold only where original is bold, section headings blue `#1F5FA8`, page 1 = header image, OFFER LETTER, Ref/Date, To, Subject, opening, 1. Position & Reporting (borderless 2-col table), 2. Key Responsibilities (bullets, bold titles), footer image; page 2 = header, 3. Salary & Facilities (bordered table: Particular | Terms; rows: Monthly Gross Salary ₹X/- per month, Accommodation, Official Transportation, Food, extras — multiple points as separate lines, no numbering), 4/5/6 paragraphs (multi-line = separate paragraphs), closing, "Sincerely, For {COMPANY}", signature image + "Authorised Signatory", stamp image, ACCEPTANCE BY EMPLOYEE paragraph, "Employee Signature: ____ Date: ____", footer image. Placeholders in letter texts: {{NAME}} {{FIRST_NAME}} {{DESIGNATION}} {{COMPANY}} {{JOINING_DATE}} {{ACCEPT_BY}} {{NOTICE_PERIOD}} {{SALARY}} {{REPORTING_TO}} {{POSTING}} {{PROJECT}}. Fit check warns if page 1/2 too long.
- Ref numbering per company per year: `MC/OL/2026/001` (prefix from company). Store PDF in bucket `offers/<company_id>/<ref>.pdf`, save row, mark candidate Selected + joining date, add call_log note, audit.
- Issued offers: grouped by base_ref; card shows active version, status segmented control (Issued/Accepted/Declined/Expired/Withdrawn — Accepted sets accepted_on), buttons: PDF, **Edit → new version** (loads payload into Issue form; submit creates `-v2`, `-v3` … and makes it active), WhatsApp to employee (message + signed URL), WhatsApp to HR, Profile, **Versions (n)** → list with "Make main", PDF, Delete (to Trash). Duplicate warning if candidate already has an active Issued/Accepted offer.
### 3.5 Reports (`/tracker/reports`)
- Monthly KPIs (interviews, selected, rejected, offers issued/accepted), 6-month trend chart, by-position table, export CSV.

## 4. Master (`/master`) — ERP level, owner/admin edit, others view
Tabs, one per list: Designation · Department · Project · Site · Reporting To · Place of Posting · Notice Period · Accommodation · Transport · Food · Responsibilities · Letter text. Each list tab: left "Add {type}" form, right numbered list (1,2,3…) with edit/delete and "N in use". Responsibilities tab: designation ▼ → points list (title + text) add/edit/delete/reorder. Letter text tab: one textarea per key with Save / Reset to original, placeholder help banner. Deleting a master entry moves it to Trash.
These masters feed every dropdown in the app (candidate form, offer form, filters).

## 5. Trash (`/trash`)
Chips: All / Candidates / Offers / Masters. Card: label, details, deleted at, by, reason. Buttons: **Restore** (candidate restores with its calls + offers + files; offer restores version; master restores entry), **Delete forever**, header **Empty trash** (double confirm). Storage files are kept on delete and only removed on "Delete forever".

## 6. Settings (`/settings`)
Company: name, legal name, tagline, address, HR WhatsApp number, offer ref prefix, logo upload, letterhead uploads (header, footer, signature, stamp → bucket `letterhead/<company_id>/`). Team: members list, invite (email + role), change role, remove. Profile: name, phone, password.

## 7. Server routes (`/app/api/...`)
- `POST /api/ai/resume` {text} → candidate fields JSON (prompt: extract the AI fields; return strict JSON; dates ISO; mobile 10 digits; gender Male/Female; age computed).
- `POST /api/ai/resume-file` (multipart) → same, multimodal.
- `POST /api/ai/score` {candidateId, requirement} → {score, reasons}.
- `POST /api/offers/preview` and `POST /api/offers/create` (pdf-lib; versions; audit).
- `POST /api/share` — PWA share target: stores the file temporarily (bucket `resumes/<company>/incoming/`) and redirects to `/tracker/new?incoming=<path>`; New interview page picks it up and runs the AI flow automatically.
- `GET /api/files/signed?path=` → short-lived signed URL for resumes/offers.
All routes: check session, derive company_id from profile, log to audit_log for writes.

## 8. Data import (one-time)
`scripts/import-from-sheet.ts`: reads a CSV export of the old Google Sheet (21 columns in this order: Interview ID | Interview Date | Candidate Name | Gender | Date of Birth | Age | Mobile No. | Email | Address | Pincode | Position Applied For | Education / Qualification | Total Experience (Years) | Current Location | Current Salary | Expected Salary | Joining Availability | Final Status | Joining Date | Resume Link | Remarks) and inserts candidates (keeping Interview ID as interview_no). Resume links stay as text in remarks if not downloadable.

## 9. Quality bar
- TypeScript strict, ESLint clean, `npm run build` passes.
- Every list page: loading skeleton, empty state, error toast.
- Mobile-first; test at 360px, 768px, 1280px.
- Marathi (Roman script) micro-copy where the current app has it (toasts/hints); labels in English.
- Commit + push after each section; final message: list of routes, env vars needed in Vercel, and the SQL migration I must run.

## 10. Order of work
1. Project init, Tailwind/shadcn, Supabase clients, auth pages, middleware, layout shell (desktop + mobile), splash/progress. Push.
2. Copy `supabase/migrations/0001_schema.sql`, generate TS types (`supabase gen types` if CLI available, else hand-written types matching the schema). Tell me to run the SQL. Push.
3. Masters + Settings + Trash. Push.
4. Candidates list, profile sheet, call logs, follow-ups. Push.
5. New interview + AI routes + duplicate check + share target. Push.
6. Offers (issue, preview, PDF, versions, WhatsApp). Push.
7. ERP home dashboard, global search, reports, import script, PWA polish. Push.
Stop after each step and give me a 3-line status; continue when I say "next".
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-09-25T22:28:38+05:30.
</ADDITIONAL_METADATA>
<USER_SETTINGS_CHANGE>
The user changed setting `Model Selection` from None to Gemini 3.8 Flash (Medium). No need to comment on this change if the user doesn't ask about it. If reporting what model you are, please use a human readable name instead of the exact string.
</USER_SETTINGS_CHANGE>