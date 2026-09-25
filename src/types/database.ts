export type UserRole = "owner" | "admin" | "recruiter" | "hr" | "viewer";
export type CandidateStatus = "Pending Call" | "Pending" | "Hold" | "Selected" | "Rejected";
export type OfferStatus = "Issued" | "Accepted" | "Declined" | "Expired" | "Withdrawn";

export interface Company {
  id: string;
  name: string;
  legal_name: string | null;
  tagline: string | null;
  address: string | null;
  whatsapp_hr: string | null;
  offer_ref_prefix: string | null;
  logo_url: string | null;
  letterhead: {
    header?: string;
    footer?: string;
    sign?: string;
    stamp?: string;
  } | null;
  settings: Record<string, unknown> | null;
  created_at: string;
}

export interface Profile {
  id: string;
  company_id: string;
  full_name: string | null;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  company?: Company;
}

export interface Invite {
  id: string;
  company_id: string;
  email: string;
  role: UserRole;
  token: string;
  accepted_at: string | null;
  created_at: string;
}

export interface Master {
  id: string;
  company_id: string;
  type: string;
  value: string;
  detail: string | null;
  sort_order: number;
  created_at: string;
}

export interface Responsibility {
  id: string;
  company_id: string;
  designation: string;
  title: string | null;
  text: string;
  sort_order: number;
}

export interface LetterText {
  id: string;
  company_id: string;
  key: string;
  title: string;
  text: string;
  updated_at: string;
}

export interface Candidate {
  id: string;
  company_id: string;
  interview_no: number;
  interview_date: string | null;
  candidate_name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  age: number | null;
  mobile_no: string | null;
  email: string | null;
  address: string | null;
  pincode: string | null;
  position_applied_for: string | null;
  education: string | null;
  total_experience_years: number | null;
  current_location: string | null;
  current_salary: string | null;
  expected_salary: string | null;
  joining_availability: string | null;
  final_status: CandidateStatus;
  joining_date: string | null;
  resume_path: string | null;
  remarks: string | null;
  site: string | null;
  ai_score: number | null;
  ai_score_note: string | null;
  documents: { title: string; checked: boolean }[] | null;
  interview_event_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  latest_offer?: Offer | null;
  last_call?: CallLog | null;
}

export interface CallLog {
  id: string;
  company_id: string;
  candidate_id: string;
  outcome: string;
  note: string | null;
  next_follow_up: string | null;
  logged_by: string | null;
  created_at: string;
  candidate?: Candidate;
  logger_profile?: Profile;
}

export interface Offer {
  id: string;
  company_id: string;
  candidate_id: string;
  base_ref: string;
  version: number;
  ref_no: string;
  is_active: boolean;
  designation: string | null;
  salary: string | null;
  letter_date: string | null;
  joining_date: string | null;
  accept_by: string | null;
  status: OfferStatus;
  accepted_on: string | null;
  pdf_path: string | null;
  payload: Record<string, any>;
  note: string | null;
  issued_by: string | null;
  created_at: string;
  candidate?: Candidate;
}

export interface AuditLog {
  id: number;
  company_id: string;
  actor: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  details: string | null;
  created_at: string;
}

export interface TrashItem {
  id: string;
  company_id: string;
  type: "Candidate" | "Offer" | "Master";
  key: string | null;
  label: string | null;
  details: string | null;
  payload: Record<string, any>;
  reason: string | null;
  deleted_by: string | null;
  deleted_at: string;
}
