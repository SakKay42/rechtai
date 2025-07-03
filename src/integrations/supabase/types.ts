export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      chat_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          language: string
          legal_topic: string | null
          messages: Json
          status: Database["public"]["Enums"]["chat_status"]
          summary: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          language: string
          legal_topic?: string | null
          messages?: Json
          status?: Database["public"]["Enums"]["chat_status"]
          summary?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          language?: string
          legal_topic?: string | null
          messages?: Json
          status?: Database["public"]["Enums"]["chat_status"]
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_requests: {
        Row: {
          chat_session_id: string | null
          completed_at: string | null
          content: Json
          created_at: string
          document_type: Database["public"]["Enums"]["document_type"]
          generated_content: string | null
          id: string
          language: Database["public"]["Enums"]["app_language"]
          status: Database["public"]["Enums"]["document_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chat_session_id?: string | null
          completed_at?: string | null
          content?: Json
          created_at?: string
          document_type: Database["public"]["Enums"]["document_type"]
          generated_content?: string | null
          id?: string
          language: Database["public"]["Enums"]["app_language"]
          status?: Database["public"]["Enums"]["document_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chat_session_id?: string | null
          completed_at?: string | null
          content?: Json
          created_at?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          generated_content?: string | null
          id?: string
          language?: Database["public"]["Enums"]["app_language"]
          status?: Database["public"]["Enums"]["document_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_requests_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_exports: {
        Row: {
          chat_session_id: string
          created_at: string
          expires_at: string
          file_name: string
          file_path: string | null
          file_size: number | null
          id: string
          status: string
          user_id: string
        }
        Insert: {
          chat_session_id: string
          created_at?: string
          expires_at?: string
          file_name: string
          file_path?: string | null
          file_size?: number | null
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          chat_session_id?: string
          created_at?: string
          expires_at?: string
          file_name?: string
          file_path?: string | null
          file_size?: number | null
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_exports_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdf_exports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          chat_count_current_month: number
          created_at: string
          email: string
          first_name: string | null
          id: string
          is_premium: boolean | null
          last_name: string | null
          preferred_language: Database["public"]["Enums"]["app_language"]
          role: Database["public"]["Enums"]["user_role"]
          subscription_reset_date: string
          updated_at: string
        }
        Insert: {
          chat_count_current_month?: number
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          is_premium?: boolean | null
          last_name?: string | null
          preferred_language?: Database["public"]["Enums"]["app_language"]
          role?: Database["public"]["Enums"]["user_role"]
          subscription_reset_date?: string
          updated_at?: string
        }
        Update: {
          chat_count_current_month?: number
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          is_premium?: boolean | null
          last_name?: string | null
          preferred_language?: Database["public"]["Enums"]["app_language"]
          role?: Database["public"]["Enums"]["user_role"]
          subscription_reset_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscription_tiers: {
        Row: {
          chat_limit_monthly: number | null
          created_at: string
          has_document_generation: boolean
          has_pdf_export: boolean
          id: string
          is_active: boolean
          name: string
          price_monthly: number
        }
        Insert: {
          chat_limit_monthly?: number | null
          created_at?: string
          has_document_generation?: boolean
          has_pdf_export?: boolean
          id?: string
          is_active?: boolean
          name: string
          price_monthly?: number
        }
        Update: {
          chat_limit_monthly?: number | null
          created_at?: string
          has_document_generation?: boolean
          has_pdf_export?: boolean
          id?: string
          is_active?: boolean
          name?: string
          price_monthly?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_create_chat: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      reset_monthly_limits: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      app_language: "nl" | "en" | "ar" | "es" | "ru" | "fr"
      chat_status: "active" | "completed" | "archived"
      document_status: "pending" | "generating" | "completed" | "failed"
      document_type: "complaint" | "lawsuit" | "letter" | "form"
      user_role: "user" | "premium" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_language: ["nl", "en", "ar", "es", "ru", "fr"],
      chat_status: ["active", "completed", "archived"],
      document_status: ["pending", "generating", "completed", "failed"],
      document_type: ["complaint", "lawsuit", "letter", "form"],
      user_role: ["user", "premium", "admin"],
    },
  },
} as const
