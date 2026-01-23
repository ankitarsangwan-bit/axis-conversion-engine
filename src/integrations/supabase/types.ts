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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      data_conflicts: {
        Row: {
          application_id: string
          created_at: string
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          resolution: string | null
          resolved_at: string | null
          upload_id: string | null
        }
        Insert: {
          application_id: string
          created_at?: string
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          resolution?: string | null
          resolved_at?: string | null
          upload_id?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          resolution?: string | null
          resolved_at?: string | null
          upload_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_conflicts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "mis_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      data_freshness: {
        Row: {
          created_at: string
          id: string
          last_updated: string
          latency_hours: number | null
          record_count: number | null
          source_name: string
          source_type: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_updated?: string
          latency_hours?: number | null
          record_count?: number | null
          source_name: string
          source_type?: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_updated?: string
          latency_hours?: number | null
          record_count?: number | null
          source_name?: string
          source_type?: string
          status?: string
        }
        Relationships: []
      }
      mis_records: {
        Row: {
          ad_status: string | null
          application_date: string | null
          application_id: string
          applications: number | null
          bank_event_date: string | null
          blaze_output: string | null
          bureau_pass: number | null
          card_type: string | null
          core_non_core: string | null
          created_at: string
          dedupe_pass: number | null
          dip_ok_status: string | null
          disbursed: number | null
          disbursement_amount: number | null
          etcc: string | null
          existing_c: string | null
          final_status: string | null
          id: string
          ipa_status: string | null
          kyc_completed: boolean | null
          last_updated_date: string | null
          lead_quality: string | null
          login_status: string | null
          mis_month: string | null
          month: string
          name: string | null
          pincode: string | null
          product: string | null
          rejection_reason: string | null
          state: string | null
          upload_id: string | null
          vkyc_description: string | null
          vkyc_eligible: string | null
          vkyc_pass: number | null
          vkyc_status: string | null
        }
        Insert: {
          ad_status?: string | null
          application_date?: string | null
          application_id: string
          applications?: number | null
          bank_event_date?: string | null
          blaze_output?: string | null
          bureau_pass?: number | null
          card_type?: string | null
          core_non_core?: string | null
          created_at?: string
          dedupe_pass?: number | null
          dip_ok_status?: string | null
          disbursed?: number | null
          disbursement_amount?: number | null
          etcc?: string | null
          existing_c?: string | null
          final_status?: string | null
          id?: string
          ipa_status?: string | null
          kyc_completed?: boolean | null
          last_updated_date?: string | null
          lead_quality?: string | null
          login_status?: string | null
          mis_month?: string | null
          month: string
          name?: string | null
          pincode?: string | null
          product?: string | null
          rejection_reason?: string | null
          state?: string | null
          upload_id?: string | null
          vkyc_description?: string | null
          vkyc_eligible?: string | null
          vkyc_pass?: number | null
          vkyc_status?: string | null
        }
        Update: {
          ad_status?: string | null
          application_date?: string | null
          application_id?: string
          applications?: number | null
          bank_event_date?: string | null
          blaze_output?: string | null
          bureau_pass?: number | null
          card_type?: string | null
          core_non_core?: string | null
          created_at?: string
          dedupe_pass?: number | null
          dip_ok_status?: string | null
          disbursed?: number | null
          disbursement_amount?: number | null
          etcc?: string | null
          existing_c?: string | null
          final_status?: string | null
          id?: string
          ipa_status?: string | null
          kyc_completed?: boolean | null
          last_updated_date?: string | null
          lead_quality?: string | null
          login_status?: string | null
          mis_month?: string | null
          month?: string
          name?: string | null
          pincode?: string | null
          product?: string | null
          rejection_reason?: string | null
          state?: string | null
          upload_id?: string | null
          vkyc_description?: string | null
          vkyc_eligible?: string | null
          vkyc_pass?: number | null
          vkyc_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mis_records_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "mis_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      mis_uploads: {
        Row: {
          created_at: string
          file_name: string | null
          id: string
          new_records: number
          record_count: number
          status: string
          updated_records: number
          upload_date: string
          upload_id: string
          upload_time: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          id?: string
          new_records?: number
          record_count?: number
          status?: string
          updated_records?: number
          upload_date?: string
          upload_id: string
          upload_time?: string
          uploaded_by?: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          id?: string
          new_records?: number
          record_count?: number
          status?: string
          updated_records?: number
          upload_date?: string
          upload_id?: string
          upload_time?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      quality_metrics: {
        Row: {
          common_issues: Json | null
          created_at: string
          id: string
          invalid_records: number | null
          metric_type: string
          record_date: string
          total_records: number | null
          valid_records: number | null
          validation_rate: number | null
        }
        Insert: {
          common_issues?: Json | null
          created_at?: string
          id?: string
          invalid_records?: number | null
          metric_type: string
          record_date?: string
          total_records?: number | null
          valid_records?: number | null
          validation_rate?: number | null
        }
        Update: {
          common_issues?: Json | null
          created_at?: string
          id?: string
          invalid_records?: number | null
          metric_type?: string
          record_date?: string
          total_records?: number | null
          valid_records?: number | null
          validation_rate?: number | null
        }
        Relationships: []
      }
      vkyc_metrics: {
        Row: {
          created_at: string
          face_match_done: number | null
          id: string
          month: string
          state: string | null
          vkyc_attempted: number | null
          vkyc_completed: number | null
          vkyc_initiated: number | null
        }
        Insert: {
          created_at?: string
          face_match_done?: number | null
          id?: string
          month: string
          state?: string | null
          vkyc_attempted?: number | null
          vkyc_completed?: number | null
          vkyc_initiated?: number | null
        }
        Update: {
          created_at?: string
          face_match_done?: number | null
          id?: string
          month?: string
          state?: string | null
          vkyc_attempted?: number | null
          vkyc_completed?: number | null
          vkyc_initiated?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
