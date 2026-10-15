export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json }
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
      customers: {
        Row: {
          alternative_phone_normalized: string | null
          area: string | null
          city: string | null
          created_at: string
          default_address: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string | null
          primary_phone_normalized: string
          state: string | null
          updated_at: string
          whatsapp_phone_normalized: string | null
        }
        ComputedFields: never
        Insert: {
          alternative_phone_normalized?: string | null
          area?: string | null
          city?: string | null
          created_at?: string
          default_address?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name?: string | null
          primary_phone_normalized: string
          state?: string | null
          updated_at?: string
          whatsapp_phone_normalized?: string | null
        }
        Update: {
          alternative_phone_normalized?: string | null
          area?: string | null
          city?: string | null
          created_at?: string
          default_address?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string | null
          primary_phone_normalized?: string
          state?: string | null
          updated_at?: string
          whatsapp_phone_normalized?: string | null
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          address_line: string
          area: string
          city: string | null
          courier_name: string | null
          courier_phone: string | null
          created_at: string
          delivered_at: string | null
          delivery_window: string | null
          dispatched_at: string | null
          failure_reason_code: string | null
          failure_reason_note: string | null
          id: string
          landmark: string | null
          order_id: string
          recipient_name: string
          recipient_phone: string
          scheduled_date: string | null
          state: string
          status: Database['public']['Enums']['delivery_status']
          tracking_reference: string | null
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          address_line: string
          area: string
          city?: string | null
          courier_name?: string | null
          courier_phone?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_window?: string | null
          dispatched_at?: string | null
          failure_reason_code?: string | null
          failure_reason_note?: string | null
          id?: string
          landmark?: string | null
          order_id: string
          recipient_name: string
          recipient_phone: string
          scheduled_date?: string | null
          state: string
          status?: Database['public']['Enums']['delivery_status']
          tracking_reference?: string | null
          updated_at?: string
        }
        Update: {
          address_line?: string
          area?: string
          city?: string | null
          courier_name?: string | null
          courier_phone?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_window?: string | null
          dispatched_at?: string | null
          failure_reason_code?: string | null
          failure_reason_note?: string | null
          id?: string
          landmark?: string | null
          order_id?: string
          recipient_name?: string
          recipient_phone?: string
          scheduled_date?: string | null
          state?: string
          status?: Database['public']['Enums']['delivery_status']
          tracking_reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'deliveries_order_id_fkey'
            columns: ['order_id']
            isOneToOne: true
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
        ]
      }
      idempotency_keys: {
        Row: {
          created_at: string
          expires_at: string
          key: string
          request_fingerprint: string
          response_payload: Json | null
          scope: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          expires_at: string
          key: string
          request_fingerprint: string
          response_payload?: Json | null
          scope: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          key?: string
          request_fingerprint?: string
          response_payload?: Json | null
          scope?: string
        }
        Relationships: []
      }
      offer_items: {
        Row: {
          created_at: string
          id: string
          item_type: Database['public']['Enums']['order_item_type']
          offer_id: string
          product_id: string
          quantity: number
          unit_price: number
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: string
          item_type?: Database['public']['Enums']['order_item_type']
          offer_id: string
          product_id: string
          quantity: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          item_type?: Database['public']['Enums']['order_item_type']
          offer_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: 'offer_items_offer_id_fkey'
            columns: ['offer_id']
            isOneToOne: false
            referencedRelation: 'active_offer_catalog'
            referencedColumns: ['offer_id']
          },
          {
            foreignKeyName: 'offer_items_offer_id_fkey'
            columns: ['offer_id']
            isOneToOne: false
            referencedRelation: 'offers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'offer_items_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'active_offer_catalog'
            referencedColumns: ['product_id']
          },
          {
            foreignKeyName: 'offer_items_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      offers: {
        Row: {
          active: boolean
          base_price: number
          code: string
          created_at: string
          currency: string
          id: string
          metadata: NonNullable<Json>
          name: string
          prepaid_price: number | null
          sort_order: number
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          base_price: number
          code: string
          created_at?: string
          currency?: string
          id?: string
          metadata?: NonNullable<Json>
          name: string
          prepaid_price?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_price?: number
          code?: string
          created_at?: string
          currency?: string
          id?: string
          metadata?: NonNullable<Json>
          name?: string
          prepaid_price?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      operational_settings: {
        Row: {
          business_email: string | null
          business_phone: string | null
          created_at: string
          default_currency: string
          duplicate_warning_hours: number
          id: string
          updated_at: string
          updated_by_user_id: string | null
        }
        ComputedFields: never
        Insert: {
          business_email?: string | null
          business_phone?: string | null
          created_at?: string
          default_currency?: string
          duplicate_warning_hours?: number
          id: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          business_email?: string | null
          business_phone?: string | null
          created_at?: string
          default_currency?: string
          duplicate_warning_hours?: number
          id?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'operational_settings_updated_by_user_id_fkey'
            columns: ['updated_by_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      order_events: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          from_state: string | null
          id: string
          metadata: NonNullable<Json>
          order_id: string | null
          to_state: string | null
        }
        ComputedFields: never
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          from_state?: string | null
          id?: string
          metadata?: NonNullable<Json>
          order_id?: string | null
          to_state?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          from_state?: string | null
          id?: string
          metadata?: NonNullable<Json>
          order_id?: string | null
          to_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'order_events_actor_user_id_fkey'
            columns: ['actor_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_events_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          item_name_snapshot: string
          item_type: Database['public']['Enums']['order_item_type']
          order_id: string
          product_id: string | null
          quantity: number
          sku_snapshot: string | null
          total_price: number
          unit_price: number
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: string
          item_name_snapshot: string
          item_type: Database['public']['Enums']['order_item_type']
          order_id: string
          product_id?: string | null
          quantity: number
          sku_snapshot?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          item_name_snapshot?: string
          item_type?: Database['public']['Enums']['order_item_type']
          order_id?: string
          product_id?: string | null
          quantity?: number
          sku_snapshot?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: 'order_items_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_items_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'active_offer_catalog'
            referencedColumns: ['product_id']
          },
          {
            foreignKeyName: 'order_items_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      orders: {
        Row: {
          assigned_to_user_id: string | null
          attribution_metadata: NonNullable<Json>
          campaign_name: string | null
          cancellation_reason_code: string | null
          cancellation_reason_note: string | null
          cancelled_at: string | null
          click_id_type: string | null
          click_id_value: string | null
          completed_at: string | null
          created_at: string
          currency: string
          customer_id: string
          customer_note: string | null
          delivery_fee_amount: number
          discount_amount: number
          id: string
          internal_note: string | null
          landing_page: string | null
          offer_id: string
          order_number: string
          order_status: Database['public']['Enums']['order_status']
          payment_method: Database['public']['Enums']['payment_method']
          possible_duplicate: boolean
          referrer: string | null
          source: Database['public']['Enums']['order_source']
          source_detail: string | null
          subtotal_amount: number
          total_amount: number
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        ComputedFields: never
        Insert: {
          assigned_to_user_id?: string | null
          attribution_metadata?: NonNullable<Json>
          campaign_name?: string | null
          cancellation_reason_code?: string | null
          cancellation_reason_note?: string | null
          cancelled_at?: string | null
          click_id_type?: string | null
          click_id_value?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_id: string
          customer_note?: string | null
          delivery_fee_amount?: number
          discount_amount?: number
          id?: string
          internal_note?: string | null
          landing_page?: string | null
          offer_id: string
          order_number: string
          order_status?: Database['public']['Enums']['order_status']
          payment_method: Database['public']['Enums']['payment_method']
          possible_duplicate?: boolean
          referrer?: string | null
          source: Database['public']['Enums']['order_source']
          source_detail?: string | null
          subtotal_amount: number
          total_amount: number
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          assigned_to_user_id?: string | null
          attribution_metadata?: NonNullable<Json>
          campaign_name?: string | null
          cancellation_reason_code?: string | null
          cancellation_reason_note?: string | null
          cancelled_at?: string | null
          click_id_type?: string | null
          click_id_value?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_id?: string
          customer_note?: string | null
          delivery_fee_amount?: number
          discount_amount?: number
          id?: string
          internal_note?: string | null
          landing_page?: string | null
          offer_id?: string
          order_number?: string
          order_status?: Database['public']['Enums']['order_status']
          payment_method?: Database['public']['Enums']['payment_method']
          possible_duplicate?: boolean
          referrer?: string | null
          source?: Database['public']['Enums']['order_source']
          source_detail?: string | null
          subtotal_amount?: number
          total_amount?: number
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'orders_assigned_to_user_id_fkey'
            columns: ['assigned_to_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_offer_id_fkey'
            columns: ['offer_id']
            isOneToOne: false
            referencedRelation: 'active_offer_catalog'
            referencedColumns: ['offer_id']
          },
          {
            foreignKeyName: 'orders_offer_id_fkey'
            columns: ['offer_id']
            isOneToOne: false
            referencedRelation: 'offers'
            referencedColumns: ['id']
          },
        ]
      }
      payment_provider_events: {
        Row: {
          event_id: string
          event_type: string
          id: string
          payload_hash: string
          payment_id: string | null
          processed_at: string | null
          processed_status: string
          provider: string
          provider_reference: string
          received_at: string
        }
        ComputedFields: never
        Insert: {
          event_id: string
          event_type: string
          id?: string
          payload_hash: string
          payment_id?: string | null
          processed_at?: string | null
          processed_status?: string
          provider: string
          provider_reference: string
          received_at?: string
        }
        Update: {
          event_id?: string
          event_type?: string
          id?: string
          payload_hash?: string
          payment_id?: string | null
          processed_at?: string | null
          processed_status?: string
          provider?: string
          provider_reference?: string
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'payment_provider_events_payment_id_fkey'
            columns: ['payment_id']
            isOneToOne: false
            referencedRelation: 'payments'
            referencedColumns: ['id']
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          failed_at: string | null
          id: string
          method: Database['public']['Enums']['payment_method']
          order_id: string
          paid_at: string | null
          provider: string | null
          provider_payload: Json | null
          provider_reference: string | null
          refunded_at: string | null
          status: Database['public']['Enums']['payment_status']
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          amount: number
          created_at?: string
          failed_at?: string | null
          id?: string
          method: Database['public']['Enums']['payment_method']
          order_id: string
          paid_at?: string | null
          provider?: string | null
          provider_payload?: Json | null
          provider_reference?: string | null
          refunded_at?: string | null
          status: Database['public']['Enums']['payment_status']
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          failed_at?: string | null
          id?: string
          method?: Database['public']['Enums']['payment_method']
          order_id?: string
          paid_at?: string | null
          provider?: string | null
          provider_payload?: Json | null
          provider_reference?: string | null
          refunded_at?: string | null
          status?: Database['public']['Enums']['payment_status']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'payments_order_id_fkey'
            columns: ['order_id']
            isOneToOne: true
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
        }
        ComputedFields: never
        Insert: {
          code: string
          created_at?: string
          description: string
          id?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          sku: string
          slug: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          sku: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          sku?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profile_roles: {
        Row: {
          assigned_by_user_id: string | null
          created_at: string
          profile_id: string
          role_id: string
        }
        ComputedFields: never
        Insert: {
          assigned_by_user_id?: string | null
          created_at?: string
          profile_id: string
          role_id: string
        }
        Update: {
          assigned_by_user_id?: string | null
          created_at?: string
          profile_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profile_roles_assigned_by_user_id_fkey'
            columns: ['assigned_by_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'profile_roles_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'profile_roles_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'roles'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          full_name: string
          id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      public_request_limits: {
        Row: {
          bucket_key: string
          request_count: number
          updated_at: string
          window_started_at: string
        }
        ComputedFields: never
        Insert: {
          bucket_key: string
          request_count: number
          updated_at?: string
          window_started_at: string
        }
        Update: {
          bucket_key?: string
          request_count?: number
          updated_at?: string
          window_started_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          permission_id: string
          role_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'role_permissions_permission_id_fkey'
            columns: ['permission_id']
            isOneToOne: false
            referencedRelation: 'permissions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'role_permissions_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'roles'
            referencedColumns: ['id']
          },
        ]
      }
      roles: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        ComputedFields: never
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_offer_catalog: {
        Row: {
          base_price: number | null
          currency: string | null
          item_type: Database['public']['Enums']['order_item_type'] | null
          offer_code: string | null
          offer_id: string | null
          offer_item_id: string | null
          offer_name: string | null
          prepaid_price: number | null
          product_id: string | null
          product_name: string | null
          product_sku: string | null
          product_slug: string | null
          quantity: number | null
          sort_order: number | null
          unit_price: number | null
        }
        ComputedFields: never
        Relationships: []
      }
    }
    Functions: {
      cancel_order: {
        Args: { cancellation_code: string; cancellation_note?: string; target_order_id: string }
        Returns: Database['public']['Enums']['order_status']
      }
      check_public_order_rate_limit: {
        Args: { hashed_client_key: string; maximum_requests?: number; window_seconds?: number }
        Returns: {
          allowed: boolean
          retry_after_seconds: number
        }[]
      }
      complete_order: {
        Args: { target_order_id: string }
        Returns: Database['public']['Enums']['order_status']
      }
      complete_staff_invite: {
        Args: {
          actor_user_id: string
          target_email: string
          target_full_name: string
          target_role_code: string
          target_user_id: string
        }
        Returns: undefined
      }
      confirm_order: {
        Args: { target_order_id: string }
        Returns: Database['public']['Enums']['order_status']
      }
      create_manual_order: {
        Args: {
          acquisition_source: Database['public']['Enums']['order_source']
          acquisition_source_detail: string
          customer_alternative_phone: string
          customer_email: string
          customer_first_name: string
          customer_last_name: string
          customer_phone: string
          delivery_address_line: string
          delivery_area: string
          delivery_city: string
          delivery_landmark: string
          delivery_state: string
          selected_offer_id: string
          selected_payment_method: Database['public']['Enums']['payment_method']
          submitted_customer_note: string
          submitted_internal_note: string
        }
        Returns: {
          order_id: string
          order_number: string
          possible_duplicate: boolean
        }[]
      }
      create_public_order: {
        Args: {
          acquisition_campaign_name: string
          acquisition_click_id_type: string
          acquisition_click_id_value: string
          acquisition_landing_page: string
          acquisition_metadata: Json
          acquisition_referrer: string
          acquisition_source: Database['public']['Enums']['order_source']
          acquisition_source_detail: string
          acquisition_utm_campaign: string
          acquisition_utm_content: string
          acquisition_utm_medium: string
          acquisition_utm_source: string
          acquisition_utm_term: string
          customer_alternative_phone: string
          customer_email: string
          customer_first_name: string
          customer_last_name: string
          customer_phone: string
          delivery_address_line: string
          delivery_area: string
          delivery_city: string
          delivery_landmark: string
          delivery_state: string
          request_fingerprint: string
          request_idempotency_key: string
          selected_offer_id: string
          selected_payment_method: Database['public']['Enums']['payment_method']
          submitted_customer_note: string
        }
        Returns: {
          order_number: string
          possible_duplicate: boolean
          replayed: boolean
        }[]
      }
      dispatch_order: {
        Args: {
          dispatch_note?: string
          target_courier_name?: string
          target_courier_phone?: string
          target_order_id: string
          target_tracking_reference?: string
        }
        Returns: Database['public']['Enums']['delivery_status']
      }
      expand_active_offer_items: {
        Args: { selected_offer_id: string }
        Returns: {
          item_name_snapshot: string
          item_type: Database['public']['Enums']['order_item_type']
          offer_item_id: string
          product_id: string
          quantity: number
          sku_snapshot: string
          total_price: number
          unit_price: number
        }[]
      }
      fail_delivery: {
        Args: { failure_code: string; failure_note?: string; target_order_id: string }
        Returns: Database['public']['Enums']['delivery_status']
      }
      get_customer_detail: { Args: { target_customer_id: string }; Returns: Json }
      get_duplicate_warning_hours: { Args: Record<PropertyKey, never>; Returns: number }
      get_executive_dashboard: { Args: { date_from?: string; date_to?: string }; Returns: Json }
      get_my_access: {
        Args: Record<PropertyKey, never>
        Returns: {
          email: string
          full_name: string
          permissions: string[]
          roles: string[]
          user_id: string
        }[]
      }
      get_operational_settings: { Args: Record<PropertyKey, never>; Returns: Json }
      get_operations_dashboard: { Args: { dashboard_date?: string }; Returns: Json }
      get_order_detail: { Args: { target_order_id: string }; Returns: Json }
      has_permission: { Args: { requested_permission: string }; Returns: boolean }
      initialize_prepaid_payment: {
        Args: {
          actor_user_id: string
          target_order_id: string
          target_provider: string
          target_reference: string
        }
        Returns: {
          already_initialized: boolean
          amount: number
          currency: string
          provider: string
          provider_reference: string
        }[]
      }
      is_active_staff: { Args: Record<PropertyKey, never>; Returns: boolean }
      list_customers: {
        Args: { page_number?: number; page_size?: number; search_text?: string }
        Returns: {
          area: string
          city: string
          currency: string
          customer_id: string
          customer_name: string
          delivered_orders: number
          last_order_date: string
          last_order_status: Database['public']['Enums']['order_status']
          primary_phone: string
          state: string
          total_count: number
          total_orders: number
          total_paid_spend: number
        }[]
      }
      list_delivery_attention: {
        Args: { queue_date?: string }
        Returns: {
          area: string
          customer_name: string
          customer_phone: string
          delivery_status: Database['public']['Enums']['delivery_status']
          delivery_window: string
          failure_reason_code: string
          order_id: string
          order_number: string
          scheduled_date: string
          state: string
          updated_at: string
        }[]
      }
      list_offer_configuration: {
        Args: Record<PropertyKey, never>
        Returns: {
          active: boolean
          base_price: number
          code: string
          currency: string
          item_summary: string
          name: string
          offer_id: string
          prepaid_price: number
          sort_order: number
          updated_at: string
        }[]
      }
      list_orders: {
        Args: {
          created_from?: string
          created_to?: string
          page_number?: number
          page_size?: number
          payment_method_filter?: string
          search_text?: string
          source_filter?: string
          status_filter?: string
        }
        Returns: {
          created_at: string
          currency: string
          customer_name: string
          customer_phone: string
          delivery_status: Database['public']['Enums']['delivery_status']
          offer_name: string
          order_id: string
          order_number: string
          order_status: Database['public']['Enums']['order_status']
          payment_method: Database['public']['Enums']['payment_method']
          payment_status: Database['public']['Enums']['payment_status']
          possible_duplicate: boolean
          source: Database['public']['Enums']['order_source']
          total_amount: number
          total_count: number
        }[]
      }
      list_staff: {
        Args: { page_number?: number; page_size?: number; search_text?: string }
        Returns: {
          active: boolean
          created_at: string
          email: string
          full_name: string
          role_code: string
          total_count: number
          user_id: string
        }[]
      }
      mark_cod_paid: {
        Args: { collection_note?: string; target_order_id: string }
        Returns: Database['public']['Enums']['payment_status']
      }
      mark_order_contacted: {
        Args: { target_order_id: string }
        Returns: Database['public']['Enums']['order_status']
      }
      mark_order_delivered: {
        Args: { delivery_note?: string; target_order_id: string }
        Returns: Database['public']['Enums']['delivery_status']
      }
      mark_order_unreachable: {
        Args: { target_order_id: string }
        Returns: Database['public']['Enums']['order_status']
      }
      next_order_number: { Args: Record<PropertyKey, never>; Returns: string }
      normalize_nigerian_phone: { Args: { raw_phone: string }; Returns: string }
      override_order_status: {
        Args: {
          override_reason: string
          target_order_id: string
          target_status: Database['public']['Enums']['order_status']
        }
        Returns: Database['public']['Enums']['order_status']
      }
      record_provider_payment_event: {
        Args: {
          provider_event_id: string
          provider_event_type: string
          provider_name: string
          reported_amount: number
          reported_currency: string
          request_payload_hash: string
          target_provider_reference: string
        }
        Returns: {
          order_id: string
          payment_status: Database['public']['Enums']['payment_status']
          replayed: boolean
        }[]
      }
      resolve_offer_pricing: {
        Args: {
          selected_offer_id: string
          selected_payment_method: Database['public']['Enums']['payment_method']
        }
        Returns: {
          currency: string
          discount_amount: number
          free_delivery: boolean
          offer_code: string
          offer_id: string
          offer_name: string
          subtotal_amount: number
          total_amount: number
        }[]
      }
      schedule_delivery: {
        Args: {
          schedule_note?: string
          target_address_line: string
          target_area: string
          target_city: string
          target_delivery_window: string
          target_landmark: string
          target_order_id: string
          target_recipient_name: string
          target_recipient_phone: string
          target_scheduled_date: string
          target_state: string
        }
        Returns: Database['public']['Enums']['delivery_status']
      }
      set_staff_active: {
        Args: { actor_user_id: string; target_active: boolean; target_user_id: string }
        Returns: undefined
      }
      set_staff_role: {
        Args: { actor_user_id: string; target_role_code: string; target_user_id: string }
        Returns: undefined
      }
      update_offer_configuration: {
        Args: {
          target_offer_id: string
          updated_active: boolean
          updated_base_price: number
          updated_prepaid_price: number
          updated_sort_order: number
        }
        Returns: undefined
      }
      update_operational_settings: {
        Args: {
          updated_business_email: string
          updated_business_phone: string
          updated_duplicate_warning_hours: number
        }
        Returns: Json
      }
      update_order_notes: {
        Args: {
          target_order_id: string
          updated_customer_note: string
          updated_internal_note: string
        }
        Returns: undefined
      }
    }
    Enums: {
      delivery_status:
        'NOT_SCHEDULED' | 'SCHEDULED' | 'DISPATCHED' | 'DELIVERED' | 'FAILED' | 'RETURNED'
      order_item_type: 'PRODUCT' | 'BONUS'
      order_source:
        | 'LANDING_PAGE'
        | 'WEBSITE'
        | 'WHATSAPP'
        | 'PHONE'
        | 'INSTAGRAM'
        | 'FACEBOOK'
        | 'TIKTOK'
        | 'AFFILIATE'
        | 'OTHER'
      order_status: 'NEW' | 'CONTACTED' | 'UNREACHABLE' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
      payment_method: 'COD' | 'PREPAID'
      payment_status: 'UNPAID' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      delivery_status: [
        'NOT_SCHEDULED',
        'SCHEDULED',
        'DISPATCHED',
        'DELIVERED',
        'FAILED',
        'RETURNED',
      ],
      order_item_type: ['PRODUCT', 'BONUS'],
      order_source: [
        'LANDING_PAGE',
        'WEBSITE',
        'WHATSAPP',
        'PHONE',
        'INSTAGRAM',
        'FACEBOOK',
        'TIKTOK',
        'AFFILIATE',
        'OTHER',
      ],
      order_status: ['NEW', 'CONTACTED', 'UNREACHABLE', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
      payment_method: ['COD', 'PREPAID'],
      payment_status: ['UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED'],
    },
  },
} as const
