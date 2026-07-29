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
      activities: {
        Row: {
          activity_type: string
          actor: string
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          message: string
        }
        Insert: {
          activity_type: string
          actor?: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          message: string
        }
        Update: {
          activity_type?: string
          actor?: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          category: string | null
          country: string | null
          created_at: string
          description: string | null
          email: string | null
          estimated_value: number
          id: string
          last_activity_at: string
          linkedin: string | null
          manufacturer: string | null
          name: string
          next_followup_date: string | null
          phone: string | null
          portfolio: string | null
          priority: string | null
          probability: number
          product: string | null
          score: number
          source_opportunity_id: string | null
          stage: string
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          category?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          estimated_value?: number
          id?: string
          last_activity_at?: string
          linkedin?: string | null
          manufacturer?: string | null
          name: string
          next_followup_date?: string | null
          phone?: string | null
          portfolio?: string | null
          priority?: string | null
          probability?: number
          product?: string | null
          score?: number
          source_opportunity_id?: string | null
          stage?: string
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          category?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          estimated_value?: number
          id?: string
          last_activity_at?: string
          linkedin?: string | null
          manufacturer?: string | null
          name?: string
          next_followup_date?: string | null
          phone?: string | null
          portfolio?: string | null
          priority?: string | null
          probability?: number
          product?: string | null
          score?: number
          source_opportunity_id?: string | null
          stage?: string
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_source_opportunity_id_fkey"
            columns: ["source_opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company_id: string | null
          created_at: string
          department: string | null
          email: string | null
          id: string
          linkedin: string | null
          name: string
          phone: string | null
          role: string | null
          source: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          linkedin?: string | null
          name: string
          phone?: string | null
          role?: string | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          linkedin?: string | null
          name?: string
          phone?: string | null
          role?: string | null
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      emails: {
        Row: {
          bcc_address: string | null
          body: string | null
          cc_address: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          id: string
          opened_at: string | null
          replied_at: string | null
          sent_at: string | null
          sent_by: string
          signature: string | null
          status: string
          subject: string | null
          to_address: string | null
          updated_at: string
        }
        Insert: {
          bcc_address?: string | null
          body?: string | null
          cc_address?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          opened_at?: string | null
          replied_at?: string | null
          sent_at?: string | null
          sent_by?: string
          signature?: string | null
          status?: string
          subject?: string | null
          to_address?: string | null
          updated_at?: string
        }
        Update: {
          bcc_address?: string | null
          body?: string | null
          cc_address?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          opened_at?: string | null
          replied_at?: string | null
          sent_at?: string | null
          sent_by?: string
          signature?: string | null
          status?: string
          subject?: string | null
          to_address?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emails_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emails_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      followups: {
        Row: {
          company_id: string | null
          created_at: string
          due_date: string | null
          id: string
          note: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          note?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "followups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      icsr_attachments: {
        Row: {
          case_id: string | null
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          storage_path: string | null
          uploaded_by: string
        }
        Insert: {
          case_id?: string | null
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          storage_path?: string | null
          uploaded_by?: string
        }
        Update: {
          case_id?: string | null
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          storage_path?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "icsr_attachments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "icsr_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      icsr_case_events: {
        Row: {
          actor: string
          case_id: string | null
          created_at: string
          event_type: string
          id: string
          message: string
        }
        Insert: {
          actor?: string
          case_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          message: string
        }
        Update: {
          actor?: string
          case_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "icsr_case_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "icsr_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      icsr_cases: {
        Row: {
          action_taken: string | null
          ai_medical_summary: string | null
          ai_narrative: string | null
          assignee: string | null
          batch: string | null
          case_ref: string
          causality: string | null
          channel: string | null
          cioms_generated: boolean
          concomitant_medication: string | null
          country: string | null
          created_at: string
          dechallenge: string | null
          dosage_form: string | null
          dose: string | null
          due_date: string | null
          duplicate_of: string | null
          duplicate_outcome: string | null
          e2b_generated: boolean
          event_description: string | null
          fingerprint: string | null
          id: string
          indication: string | null
          is_draft: boolean
          lab_results: string | null
          manufacturer: string | null
          meddra_term: string | null
          medical_history: string | null
          medwatch_generated: boolean
          notes: string | null
          onset_date: string | null
          outcome: string | null
          patient_age: string | null
          patient_ethnicity: string | null
          patient_initials: string | null
          patient_pregnancy: string | null
          patient_sex: string | null
          patient_weight: string | null
          product: string | null
          product_id: string | null
          received_date: string | null
          rechallenge: string | null
          regulator: string | null
          report_type: string | null
          reporter_contact: string | null
          reporter_email: string | null
          reporter_name: string | null
          route: string | null
          seriousness: string | null
          seriousness_criterion: string | null
          source_type: string | null
          state: string | null
          status: string
          stop_date: string | null
          submission_reference: string | null
          submitted_date: string | null
          therapy_start: string | null
          therapy_stop: string | null
          updated_at: string
        }
        Insert: {
          action_taken?: string | null
          ai_medical_summary?: string | null
          ai_narrative?: string | null
          assignee?: string | null
          batch?: string | null
          case_ref: string
          causality?: string | null
          channel?: string | null
          cioms_generated?: boolean
          concomitant_medication?: string | null
          country?: string | null
          created_at?: string
          dechallenge?: string | null
          dosage_form?: string | null
          dose?: string | null
          due_date?: string | null
          duplicate_of?: string | null
          duplicate_outcome?: string | null
          e2b_generated?: boolean
          event_description?: string | null
          fingerprint?: string | null
          id?: string
          indication?: string | null
          is_draft?: boolean
          lab_results?: string | null
          manufacturer?: string | null
          meddra_term?: string | null
          medical_history?: string | null
          medwatch_generated?: boolean
          notes?: string | null
          onset_date?: string | null
          outcome?: string | null
          patient_age?: string | null
          patient_ethnicity?: string | null
          patient_initials?: string | null
          patient_pregnancy?: string | null
          patient_sex?: string | null
          patient_weight?: string | null
          product?: string | null
          product_id?: string | null
          received_date?: string | null
          rechallenge?: string | null
          regulator?: string | null
          report_type?: string | null
          reporter_contact?: string | null
          reporter_email?: string | null
          reporter_name?: string | null
          route?: string | null
          seriousness?: string | null
          seriousness_criterion?: string | null
          source_type?: string | null
          state?: string | null
          status?: string
          stop_date?: string | null
          submission_reference?: string | null
          submitted_date?: string | null
          therapy_start?: string | null
          therapy_stop?: string | null
          updated_at?: string
        }
        Update: {
          action_taken?: string | null
          ai_medical_summary?: string | null
          ai_narrative?: string | null
          assignee?: string | null
          batch?: string | null
          case_ref?: string
          causality?: string | null
          channel?: string | null
          cioms_generated?: boolean
          concomitant_medication?: string | null
          country?: string | null
          created_at?: string
          dechallenge?: string | null
          dosage_form?: string | null
          dose?: string | null
          due_date?: string | null
          duplicate_of?: string | null
          duplicate_outcome?: string | null
          e2b_generated?: boolean
          event_description?: string | null
          fingerprint?: string | null
          id?: string
          indication?: string | null
          is_draft?: boolean
          lab_results?: string | null
          manufacturer?: string | null
          meddra_term?: string | null
          medical_history?: string | null
          medwatch_generated?: boolean
          notes?: string | null
          onset_date?: string | null
          outcome?: string | null
          patient_age?: string | null
          patient_ethnicity?: string | null
          patient_initials?: string | null
          patient_pregnancy?: string | null
          patient_sex?: string | null
          patient_weight?: string | null
          product?: string | null
          product_id?: string | null
          received_date?: string | null
          rechallenge?: string | null
          regulator?: string | null
          report_type?: string | null
          reporter_contact?: string | null
          reporter_email?: string | null
          reporter_name?: string | null
          route?: string | null
          seriousness?: string | null
          seriousness_criterion?: string | null
          source_type?: string | null
          state?: string | null
          status?: string
          stop_date?: string | null
          submission_reference?: string | null
          submitted_date?: string | null
          therapy_start?: string | null
          therapy_stop?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      icsr_followups: {
        Row: {
          case_id: string | null
          created_at: string
          due_date: string | null
          email_id: string | null
          id: string
          question: string | null
          received_at: string | null
          requested_at: string
          requested_by: string
          response: string | null
          status: string
        }
        Insert: {
          case_id?: string | null
          created_at?: string
          due_date?: string | null
          email_id?: string | null
          id?: string
          question?: string | null
          received_at?: string | null
          requested_at?: string
          requested_by?: string
          response?: string | null
          status?: string
        }
        Update: {
          case_id?: string | null
          created_at?: string
          due_date?: string | null
          email_id?: string | null
          id?: string
          question?: string | null
          received_at?: string | null
          requested_at?: string
          requested_by?: string
          response?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "icsr_followups_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "icsr_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      icsr_notes: {
        Row: {
          author: string
          body: string
          case_id: string | null
          created_at: string
          id: string
          pinned: boolean
          title: string
          updated_at: string
        }
        Insert: {
          author?: string
          body: string
          case_id?: string | null
          created_at?: string
          id?: string
          pinned?: boolean
          title?: string
          updated_at?: string
        }
        Update: {
          author?: string
          body?: string
          case_id?: string | null
          created_at?: string
          id?: string
          pinned?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "icsr_notes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "icsr_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          author: string
          body: string
          company_id: string | null
          created_at: string
          id: string
          pinned: boolean
          title: string
          updated_at: string
        }
        Insert: {
          author?: string
          body: string
          company_id?: string | null
          created_at?: string
          id?: string
          pinned?: boolean
          title?: string
          updated_at?: string
        }
        Update: {
          author?: string
          body?: string
          company_id?: string | null
          created_at?: string
          id?: string
          pinned?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          category: string | null
          close_date: string | null
          company: string
          created_at: string
          estimated_value: number
          expiry_date: string | null
          id: string
          manufacturer: string | null
          opportunity_id: number | null
          opportunity_type: string | null
          priority: string
          probability: number
          product: string | null
          product_count: number
          recommendation: string | null
          service_type: string | null
          services: string | null
          source_product_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          close_date?: string | null
          company: string
          created_at?: string
          estimated_value?: number
          expiry_date?: string | null
          id?: string
          manufacturer?: string | null
          opportunity_id?: number | null
          opportunity_type?: string | null
          priority?: string
          probability?: number
          product?: string | null
          product_count?: number
          recommendation?: string | null
          service_type?: string | null
          services?: string | null
          source_product_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          close_date?: string | null
          company?: string
          created_at?: string
          estimated_value?: number
          expiry_date?: string | null
          id?: string
          manufacturer?: string | null
          opportunity_id?: number | null
          opportunity_type?: string | null
          priority?: string
          probability?: number
          product?: string | null
          product_count?: number
          recommendation?: string | null
          service_type?: string | null
          services?: string | null
          source_product_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_source_product_id_fkey"
            columns: ["source_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stage_history: {
        Row: {
          company_id: string | null
          created_at: string
          from_stage: string | null
          id: string
          to_stage: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          from_stage?: string | null
          id?: string
          to_stage: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          from_stage?: string | null
          id?: string
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stage_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          applicant: string | null
          approval_date: string | null
          category: string | null
          composition: string | null
          created_at: string
          dosage_form: string | null
          expiry_date: string | null
          id: string
          last_synced: string
          manufacturer: string | null
          nafdac_number: string | null
          pack_size: string | null
          product_name: string
          registration_date: string | null
          route: string | null
          status: string
          strength: string | null
          updated_at: string
        }
        Insert: {
          applicant?: string | null
          approval_date?: string | null
          category?: string | null
          composition?: string | null
          created_at?: string
          dosage_form?: string | null
          expiry_date?: string | null
          id?: string
          last_synced?: string
          manufacturer?: string | null
          nafdac_number?: string | null
          pack_size?: string | null
          product_name: string
          registration_date?: string | null
          route?: string | null
          status?: string
          strength?: string | null
          updated_at?: string
        }
        Update: {
          applicant?: string | null
          approval_date?: string | null
          category?: string | null
          composition?: string | null
          created_at?: string
          dosage_form?: string | null
          expiry_date?: string | null
          id?: string
          last_synced?: string
          manufacturer?: string | null
          nafdac_number?: string | null
          pack_size?: string | null
          product_name?: string
          registration_date?: string | null
          route?: string | null
          status?: string
          strength?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      renewals: {
        Row: {
          applicant: string | null
          category: string | null
          created_at: string
          expiry_date: string | null
          id: string
          nafdac_number: string | null
          product_id: string | null
          product_name: string
          status: string
        }
        Insert: {
          applicant?: string | null
          category?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          nafdac_number?: string | null
          product_id?: string | null
          product_name: string
          status?: string
        }
        Update: {
          applicant?: string | null
          category?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          nafdac_number?: string | null
          product_id?: string | null
          product_name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "renewals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          body: string | null
          created_at: string
          id: string
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      sync_history: {
        Row: {
          created_at: string
          finished_at: string
          id: string
          message: string | null
          records_added: number
          records_updated: number
          started_at: string
          status: string
        }
        Insert: {
          created_at?: string
          finished_at?: string
          id?: string
          message?: string | null
          records_added?: number
          records_updated?: number
          started_at?: string
          status?: string
        }
        Update: {
          created_at?: string
          finished_at?: string
          id?: string
          message?: string | null
          records_added?: number
          records_updated?: number
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee: string | null
          company_id: string | null
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          due_date: string | null
          id: string
          state: string
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee?: string | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          state?: string
          task_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee?: string | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          state?: string
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      crm_dashboard_stats: { Args: never; Returns: Json }
      dashboard_stats: { Args: never; Returns: Json }
      icsr_stats: { Args: never; Returns: Json }
      opportunity_stats: { Args: never; Returns: Json }
      purge_deleted_tasks: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
