
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      chats: {
        Row: {
          created_at: string | null
          id_chat: string
          id_establishment: string
          phone_number: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id_chat?: string
          id_establishment: string
          phone_number: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id_chat?: string
          id_establishment?: string
          phone_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_id_establishment_fkey"
            columns: ["id_establishment"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id_establishment"]
          },
        ]
      }
      days: {
        Row: {
          created_at: string | null
          id_day: string
          id_establishment: string
          is_open: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id_day?: string
          id_establishment: string
          is_open?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id_day?: string
          id_establishment?: string
          is_open?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "days_id_establishment_fkey"
            columns: ["id_establishment"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id_establishment"]
          },
        ]
      }
      details_order: {
        Row: {
          created_at: string | null
          id_details_order: string
          id_menu: string | null
          id_order: string
          id_product: string | null
          note: string | null
          quantity: number | null
          selected_products: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id_details_order?: string
          id_menu?: string | null
          id_order: string
          id_product?: string | null
          note?: string | null
          quantity?: number | null
          selected_products?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id_details_order?: string
          id_menu?: string | null
          id_order?: string
          id_product?: string | null
          note?: string | null
          quantity?: number | null
          selected_products?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "details_order_id_menu_fkey"
            columns: ["id_menu"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id_menu"]
          },
          {
            foreignKeyName: "details_order_id_order_fkey"
            columns: ["id_order"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id_order"]
          },
          {
            foreignKeyName: "details_order_id_product_fkey"
            columns: ["id_product"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id_product"]
          },
        ]
      }
      establishment_users: {
        Row: {
          created_at: string | null
          created_by: string | null
          establishment_id: string | null
          id: number
          role: string | null
          status: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          establishment_id?: string | null
          id?: never
          role?: string | null
          status?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          establishment_id?: string | null
          id?: never
          role?: string | null
          status?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "establishment_users_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id_establishment"]
          },
        ]
      }
      establishments: {
        Row: {
          address: string | null
          created_at: string | null
          id_establishment: string
          name: string
          order_ratio: number | null
          phone_number: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id_establishment?: string
          name: string
          order_ratio?: number | null
          phone_number?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id_establishment?: string
          name?: string
          order_ratio?: number | null
          phone_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      menu_product: {
        Row: {
          created_at: string | null
          id_menu: string
          id_menu_product: string
          id_product: string
        }
        Insert: {
          created_at?: string | null
          id_menu: string
          id_menu_product?: string
          id_product: string
        }
        Update: {
          created_at?: string | null
          id_menu?: string
          id_menu_product?: string
          id_product?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_product_id_menu_fkey"
            columns: ["id_menu"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id_menu"]
          },
          {
            foreignKeyName: "menu_product_id_product_fkey"
            columns: ["id_product"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id_product"]
          },
        ]
      }
      menus: {
        Row: {
          category_requirements: Json | null
          created_at: string | null
          description: string | null
          id_establishment: string
          id_menu: string
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          category_requirements?: Json | null
          created_at?: string | null
          description?: string | null
          id_establishment: string
          id_menu?: string
          name: string
          price: number
          updated_at?: string | null
        }
        Update: {
          category_requirements?: Json | null
          created_at?: string | null
          description?: string | null
          id_establishment?: string
          id_menu?: string
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menus_id_establishment_fkey"
            columns: ["id_establishment"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id_establishment"]
          },
        ]
      }
      messages: {
        Row: {
          created_at: string | null
          id_chat: string
          id_message: string
          message: string
          role: string
        }
        Insert: {
          created_at?: string | null
          id_chat: string
          id_message?: string
          message: string
          role: string
        }
        Update: {
          created_at?: string | null
          id_chat?: string
          id_message?: string
          message?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_id_chat_fkey"
            columns: ["id_chat"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id_chat"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          created_at: string | null
          id_chat: string
          id_establishment: string
          id_order: string
          is_pickup: boolean
          name: string | null
          price: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id_chat: string
          id_establishment: string
          id_order?: string
          is_pickup?: boolean
          name?: string | null
          price?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id_chat?: string
          id_establishment?: string
          id_order?: string
          is_pickup?: boolean
          name?: string | null
          price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_id_chat_fkey"
            columns: ["id_chat"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id_chat"]
          },
          {
            foreignKeyName: "orders_id_establishment_fkey"
            columns: ["id_establishment"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id_establishment"]
          },
        ]
      }
      products: {
        Row: {
          available: boolean | null
          category: string
          created_at: string | null
          descripcion: string | null
          id_establishment: string
          id_product: string
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          available?: boolean | null
          category?: string
          created_at?: string | null
          descripcion?: string | null
          id_establishment: string
          id_product?: string
          name: string
          price: number
          updated_at?: string | null
        }
        Update: {
          available?: boolean | null
          category?: string
          created_at?: string | null
          descripcion?: string | null
          id_establishment?: string
          id_product?: string
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_id_establishment_fkey"
            columns: ["id_establishment"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id_establishment"]
          },
        ]
      }
      session_schedule: {
        Row: {
          closing_time: string
          created_at: string | null
          id_day: string
          id_session: string
          opening_time: string
          updated_at: string | null
        }
        Insert: {
          closing_time: string
          created_at?: string | null
          id_day: string
          id_session?: string
          opening_time: string
          updated_at?: string | null
        }
        Update: {
          closing_time?: string
          created_at?: string | null
          id_day?: string
          id_session?: string
          opening_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_schedule_id_day_fkey"
            columns: ["id_day"]
            isOneToOne: false
            referencedRelation: "days"
            referencedColumns: ["id_day"]
          },
        ]
      }
      whatsapp_auth: {
        Row: {
          created_at: string | null
          file_size: number | null
          file_type: string | null
          id_establishment: string
          id_whatsapp_auth: string
          session_data: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          file_size?: number | null
          file_type?: string | null
          id_establishment: string
          id_whatsapp_auth?: string
          session_data: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          file_size?: number | null
          file_type?: string | null
          id_establishment?: string
          id_whatsapp_auth?: string
          session_data?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_auth_id_establishment_fkey"
            columns: ["id_establishment"]
            isOneToOne: true
            referencedRelation: "establishments"
            referencedColumns: ["id_establishment"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_order_total_price: {
        Args: { p_order_id: string }
        Returns: number
      }
      user_has_establishment_access: {
        Args: { user_id: string }
        Returns: boolean
      }
      validate_menu_category_requirements: {
        Args: { p_menu_id: string; p_selected_products: Json }
        Returns: boolean
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
