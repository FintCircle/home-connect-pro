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
      areas: {
        Row: {
          city_id: string
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          city_id: string
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          city_id?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "areas_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          id: string
          name: string
          region_id: string
          slug: string
          sort_order: number
        }
        Insert: {
          id?: string
          name: string
          region_id: string
          slug: string
          sort_order?: number
        }
        Update: {
          id?: string
          name?: string
          region_id?: string
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "cities_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      landlord_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          landlord_id: string
          property_id: string
          rating: number
          tenant_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          landlord_id: string
          property_id: string
          rating: number
          tenant_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          landlord_id?: string
          property_id?: string
          rating?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "landlord_reviews_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_ugx: number
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["payment_kind"]
          property_id: string | null
          provider: string
          provider_reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Insert: {
          amount_ugx: number
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["payment_kind"]
          property_id?: string | null
          provider?: string
          provider_reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Update: {
          amount_ugx?: number
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["payment_kind"]
          property_id?: string | null
          provider?: string
          provider_reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          national_id_name: string | null
          national_id_number: string | null
          phone: string | null
          referral_code: string | null
          referred_by: string | null
          updated_at: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          national_id_name?: string | null
          national_id_number?: string | null
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          national_id_name?: string | null
          national_id_number?: string | null
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          amenities: string[]
          area_id: string
          bathrooms: number
          bedrooms: number
          created_at: string
          deposit_months: number
          description: string | null
          fence_gate: string | null
          furnishing: string
          has_units: boolean
          id: string
          landlord_id: string
          landlord_verified: boolean
          landmark: string | null
          listing_fee_ugx: number | null
          live_at: string | null
          parking_spaces: number
          power_source: string | null
          property_type: string
          rent_ugx: number
          self_contained: boolean
          sitting_rooms: number
          status: Database["public"]["Enums"]["property_status"]
          title: string
          total_units: number
          units_available: number
          updated_at: string
          video_url: string | null
          water_source: string | null
        }
        Insert: {
          amenities?: string[]
          area_id: string
          bathrooms?: number
          bedrooms?: number
          created_at?: string
          deposit_months?: number
          description?: string | null
          fence_gate?: string | null
          furnishing?: string
          has_units?: boolean
          id?: string
          landlord_id: string
          landlord_verified?: boolean
          landmark?: string | null
          listing_fee_ugx?: number | null
          live_at?: string | null
          parking_spaces?: number
          power_source?: string | null
          property_type: string
          rent_ugx: number
          self_contained?: boolean
          sitting_rooms?: number
          status?: Database["public"]["Enums"]["property_status"]
          title: string
          total_units?: number
          units_available?: number
          updated_at?: string
          video_url?: string | null
          water_source?: string | null
        }
        Update: {
          amenities?: string[]
          area_id?: string
          bathrooms?: number
          bedrooms?: number
          created_at?: string
          deposit_months?: number
          description?: string | null
          fence_gate?: string | null
          furnishing?: string
          has_units?: boolean
          id?: string
          landlord_id?: string
          landlord_verified?: boolean
          landmark?: string | null
          listing_fee_ugx?: number | null
          live_at?: string | null
          parking_spaces?: number
          power_source?: string | null
          property_type?: string
          rent_ugx?: number
          self_contained?: boolean
          sitting_rooms?: number
          status?: Database["public"]["Enums"]["property_status"]
          title?: string
          total_units?: number
          units_available?: number
          updated_at?: string
          video_url?: string | null
          water_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      property_images: {
        Row: {
          created_at: string
          id: string
          property_id: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_locations: {
        Row: {
          address_exact: string | null
          directions_note: string | null
          latitude: number | null
          longitude: number | null
          property_id: string
        }
        Insert: {
          address_exact?: string | null
          directions_note?: string | null
          latitude?: number | null
          longitude?: number | null
          property_id: string
        }
        Update: {
          address_exact?: string | null
          directions_note?: string | null
          latitude?: number | null
          longitude?: number | null
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_locations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_earnings: {
        Row: {
          amount_ugx: number
          created_at: string
          id: string
          payment_id: string | null
          referred_user_id: string | null
          referrer_id: string
        }
        Insert: {
          amount_ugx: number
          created_at?: string
          id?: string
          payment_id?: string | null
          referred_user_id?: string | null
          referrer_id: string
        }
        Update: {
          amount_ugx?: number
          created_at?: string
          id?: string
          payment_id?: string | null
          referred_user_id?: string | null
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_earnings_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      unlocks: {
        Row: {
          amount_ugx: number
          created_at: string
          id: string
          landlord_id: string
          landlord_phone: string | null
          property_id: string
          released_by_tenant: boolean
          tenant_id: string
          tenant_phone: string | null
        }
        Insert: {
          amount_ugx: number
          created_at?: string
          id?: string
          landlord_id: string
          landlord_phone?: string | null
          property_id: string
          released_by_tenant?: boolean
          tenant_id: string
          tenant_phone?: string | null
        }
        Update: {
          amount_ugx?: number
          created_at?: string
          id?: string
          landlord_id?: string
          landlord_phone?: string | null
          property_id?: string
          released_by_tenant?: boolean
          tenant_id?: string
          tenant_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unlocks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount_ugx: number
          created_at: string
          id: string
          payout_phone: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          user_id: string
        }
        Insert: {
          amount_ugx: number
          created_at?: string
          id?: string
          payout_phone?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          user_id: string
        }
        Update: {
          amount_ugx?: number
          created_at?: string
          id?: string
          payout_phone?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      attach_referral_by_code: {
        Args: { p_code: string }
        Returns: boolean
      }
      get_my_referral_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_referral_leaders: {
        Args: Record<PropertyKey, never>
        Returns: {
          referrer_id: string
          full_name: string | null
          referral_code: string | null
          joined_count: number
        }[]
      }
      generate_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      payment_kind: "listing" | "access"
      payment_status: "pending" | "paid" | "failed"
      property_status: "draft" | "live" | "taken" | "paused"
      withdrawal_status: "requested" | "paid" | "rejected"
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
      app_role: ["admin", "user"],
      payment_kind: ["listing", "access"],
      payment_status: ["pending", "paid", "failed"],
      property_status: ["draft", "live", "taken", "paused"],
      withdrawal_status: ["requested", "paid", "rejected"],
    },
  },
} as const
