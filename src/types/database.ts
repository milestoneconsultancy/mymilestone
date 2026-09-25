export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor: string | null
          company_id: string | null
          created_at: string | null
          details: string | null
          entity: string | null
          entity_id: string | null
          id: number
        }
        Insert: {
          action: string
          actor?: string | null
          company_id?: string | null
          created_at?: string | null
          details?: string | null
          entity?: string | null
          entity_id?: string | null
          id?: number
        }
        Update: {
          action?: string
          actor?: string | null
          company_id?: string | null
          created_at?: string | null
          details?: string | null
          entity?: string | null
          entity_id?: string | null
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_fkey"
            columns: ["actor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          candidate_id: string | null
          company_id: string | null
          created_at: string | null
          id: string
          logged_by: string | null
          next_follow_up: string | null
          note: string | null
          outcome: string
        }
        Insert: {
          candidate_id?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          logged_by?: string | null
          next_follow_up?: string | null
          note?: string | null
          outcome: string
        }
        Update: {
          candidate_id?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          logged_by?: string | null
          next_follow_up?: string | null
          note?: string | null
          outcome?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          address: string | null
          age: number | null
          ai_score: number | null
          ai_score_note: string | null
          candidate_name: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          current_location: string | null
          current_salary: string | null
          date_of_birth: string | null
          documents: Json | null
          education: string | null
          email: string | null
          expected_salary: string | null
          final_status: Database["public"]["Enums"]["candidate_status"] | null
          gender: string | null
          id: string
          interview_date: string | null
          interview_event_url: string | null
          interview_no: number
          joining_availability: string | null
          joining_date: string | null
          mobile_no: string | null
          pincode: string | null
          position_applied_for: string | null
          remarks: string | null
          resume_path: string | null
          site: string | null
          total_experience_years: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          age?: number | null
          ai_score?: number | null
          ai_score_note?: string | null
          candidate_name?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_location?: string | null
          current_salary?: string | null
          date_of_birth?: string | null
          documents?: Json | null
          education?: string | null
          email?: string | null
          expected_salary?: string | null
          final_status?: Database["public"]["Enums"]["candidate_status"] | null
          gender?: string | null
          id?: string
          interview_date?: string | null
          interview_event_url?: string | null
          interview_no: number
          joining_availability?: string | null
          joining_date?: string | null
          mobile_no?: string | null
          pincode?: string | null
          position_applied_for?: string | null
          remarks?: string | null
          resume_path?: string | null
          site?: string | null
          total_experience_years?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          age?: number | null
          ai_score?: number | null
          ai_score_note?: string | null
          candidate_name?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_location?: string | null
          current_salary?: string | null
          date_of_birth?: string | null
          documents?: Json | null
          education?: string | null
          email?: string | null
          expected_salary?: string | null
          final_status?: Database["public"]["Enums"]["candidate_status"] | null
          gender?: string | null
          id?: string
          interview_date?: string | null
          interview_event_url?: string | null
          interview_no?: number
          joining_availability?: string | null
          joining_date?: string | null
          mobile_no?: string | null
          pincode?: string | null
          position_applied_for?: string | null
          remarks?: string | null
          resume_path?: string | null
          site?: string | null
          total_experience_years?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          legal_name: string | null
          letterhead: Json | null
          logo_url: string | null
          name: string
          offer_ref_prefix: string | null
          settings: Json | null
          tagline: string | null
          whatsapp_hr: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          legal_name?: string | null
          letterhead?: Json | null
          logo_url?: string | null
          name: string
          offer_ref_prefix?: string | null
          settings?: Json | null
          tagline?: string | null
          whatsapp_hr?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          legal_name?: string | null
          letterhead?: Json | null
          logo_url?: string | null
          name?: string
          offer_ref_prefix?: string | null
          settings?: Json | null
          tagline?: string | null
          whatsapp_hr?: string | null
        }
        Relationships: []
      }
      counters: {
        Row: {
          company_id: string
          name: string
          value: number
        }
        Insert: {
          company_id: string
          name: string
          value?: number
        }
        Update: {
          company_id?: string
          name?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "counters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          company_id: string | null
          created_at: string | null
          email: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          token: string | null
        }
        Insert: {
          accepted_at?: string | null
          company_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          token?: string | null
        }
        Update: {
          accepted_at?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      letter_texts: {
        Row: {
          company_id: string | null
          id: string
          key: string
          text: string
          title: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          id?: string
          key: string
          text: string
          title: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          id?: string
          key?: string
          text?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "letter_texts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      masters: {
        Row: {
          company_id: string | null
          created_at: string | null
          detail: string | null
          id: string
          sort_order: number | null
          type: string
          value: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          detail?: string | null
          id?: string
          sort_order?: number | null
          type: string
          value: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          detail?: string | null
          id?: string
          sort_order?: number | null
          type?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "masters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          accept_by: string | null
          accepted_on: string | null
          base_ref: string
          candidate_id: string | null
          company_id: string | null
          created_at: string | null
          designation: string | null
          id: string
          is_active: boolean | null
          issued_by: string | null
          joining_date: string | null
          letter_date: string | null
          note: string | null
          payload: Json | null
          pdf_path: string | null
          ref_no: string
          salary: string | null
          status: Database["public"]["Enums"]["offer_status"] | null
          version: number
        }
        Insert: {
          accept_by?: string | null
          accepted_on?: string | null
          base_ref: string
          candidate_id?: string | null
          company_id?: string | null
          created_at?: string | null
          designation?: string | null
          id?: string
          is_active?: boolean | null
          issued_by?: string | null
          joining_date?: string | null
          letter_date?: string | null
          note?: string | null
          payload?: Json | null
          pdf_path?: string | null
          ref_no: string
          salary?: string | null
          status?: Database["public"]["Enums"]["offer_status"] | null
          version?: number
        }
        Update: {
          accept_by?: string | null
          accepted_on?: string | null
          base_ref?: string
          candidate_id?: string | null
          company_id?: string | null
          created_at?: string | null
          designation?: string | null
          id?: string
          is_active?: boolean | null
          issued_by?: string | null
          joining_date?: string | null
          letter_date?: string | null
          note?: string | null
          payload?: Json | null
          pdf_path?: string | null
          ref_no?: string
          salary?: string | null
          status?: Database["public"]["Enums"]["offer_status"] | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "offers_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      responsibilities: {
        Row: {
          company_id: string | null
          designation: string
          id: string
          sort_order: number | null
          text: string
          title: string | null
        }
        Insert: {
          company_id?: string | null
          designation: string
          id?: string
          sort_order?: number | null
          text: string
          title?: string | null
        }
        Update: {
          company_id?: string | null
          designation?: string
          id?: string
          sort_order?: number | null
          text?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "responsibilities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      trash: {
        Row: {
          company_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          details: string | null
          id: string
          key: string | null
          label: string | null
          payload: Json
          reason: string | null
          type: string
        }
        Insert: {
          company_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          details?: string | null
          id?: string
          key?: string | null
          label?: string | null
          payload: Json
          reason?: string | null
          type: string
        }
        Update: {
          company_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          details?: string | null
          id?: string
          key?: string | null
          label?: string | null
          payload?: Json
          reason?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "trash_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trash_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_missing_profiles: { Args: never; Returns: undefined }
      my_company: { Args: never; Returns: string }
      my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      next_counter: {
        Args: { p_company: string; p_name: string }
        Returns: number
      }
      seed_company: { Args: { p_company: string }; Returns: undefined }
    }
    Enums: {
      candidate_status:
        | "Pending Call"
        | "Pending"
        | "Hold"
        | "Selected"
        | "Rejected"
      offer_status: "Issued" | "Accepted" | "Declined" | "Expired" | "Withdrawn"
      user_role: "owner" | "admin" | "recruiter" | "hr" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      candidate_status: [
        "Pending Call",
        "Pending",
        "Hold",
        "Selected",
        "Rejected",
      ],
      offer_status: ["Issued", "Accepted", "Declined", "Expired", "Withdrawn"],
      user_role: ["owner", "admin", "recruiter", "hr", "viewer"],
    },
  },
} as const


export type UserRole = Database['public']['Enums']['user_role'];
export type CandidateStatus = Database['public']['Enums']['candidate_status'];
export type OfferStatus = Database['public']['Enums']['offer_status'];
export type Company = Database['public']['Tables']['companies']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'] & { company?: Company };
export type Invite = Database['public']['Tables']['invites']['Row'];
export type Master = Database['public']['Tables']['masters']['Row'];
export type Responsibility = Database['public']['Tables']['responsibilities']['Row'];
export type LetterText = Database['public']['Tables']['letter_texts']['Row'];
export type Candidate = Database['public']['Tables']['candidates']['Row'] & {
  latest_offer?: Offer | null;
  last_call?: CallLog | null;
};
export type CallLog = Database['public']['Tables']['call_logs']['Row'] & {
  candidate?: Candidate;
  logger_profile?: Profile;
};
export type Offer = Database['public']['Tables']['offers']['Row'] & {
  candidate?: Candidate;
};
export type AuditLog = Database['public']['Tables']['audit_log']['Row'];
export type TrashItem = Database['public']['Tables']['trash']['Row'];
