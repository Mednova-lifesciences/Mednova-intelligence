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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      dashboard_stats: { Args: never; Returns: Json }
      opportunity_stats: { Args: never; Returns: Json }
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
