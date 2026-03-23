import type {
  WiFiUser,
  BroadbandUser,
  Mikrotik,
  Package,
  Payment,
  Admin,
  Owner,
  SmsSettings,
  SmsLog,
  OwnerPaymentSettings
} from '@/types/models';

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
      wifi_users: { 
        Row: WiFiUser; 
        Insert: { 
          username: string;
          admin_id: string;
          password?: string;
          phone_number?: string;
          package_id?: string;
          package_expires_at?: string;
          is_active?: boolean;
        }; 
        Update: Partial<WiFiUser>; 
      };
      broadband_users: { 
        Row: BroadbandUser; 
        Insert: {
          username: string;
          password: string;
          admin_id: string;
          user_type?: 'pppoe' | 'static';
          phone_number?: string;
          portal_token?: string;
          package_id?: string;
          package_expires_at?: string;
          bandwidth_used_mb?: number;
          is_active?: boolean;
          last_login?: string;
        }; 
        Update: Partial<BroadbandUser>; 
      };
      mikrotiks: { 
        Row: Mikrotik; 
        Insert: {
          name: string;
          admin_id: string;
          router_id?: string;
          ip_address?: string;
          api_port?: number;
          username?: string;
          password_encrypted?: string;
          status?: 'online' | 'offline';
          mpesa_type?: 'till' | 'paybill';
          mpesa_number?: string;
          location?: string;
          total_earnings?: number;
          active_users?: number;
        }; 
        Update: Partial<Mikrotik>; 
      };
      packages: { 
        Row: Package; 
        Insert: {
          name: string;
          admin_id: string;
          package_type: 'hotspot' | 'pppoe' | 'static';
          duration_type: 'hours' | 'days' | 'weeks' | 'months';
          duration_value: number;
          download_speed_mbps?: number;
          upload_speed_mbps?: number;
          bandwidth_limit_mb?: number;
          price: number;
          is_active?: boolean;
        }; 
        Update: Partial<Package>; 
      };
      payments: { 
        Row: Payment; 
        Insert: {
          admin_id: string;
          user_phone?: string;
          amount: number;
          package_name?: string;
          status?: 'completed' | 'pending' | 'failed';
          receipt_number?: string;
        };
        Update: Partial<Payment>;
      };
      admins: {
        Row: Admin; 
        Insert: {
          owner_id: string;
          email: string;
          username: string;
          full_name: string;
          business_name?: string;
          phone?: string;
          is_active?: boolean;
          profile_picture?: string;
        }; 
        Update: Partial<Admin>; 
      };
      owners: {
        Row: Owner;
        Insert: {
          profile_id: string;
          business_name: string;
          subscription_status?: string;
          is_trial?: boolean;
        };
        Update: Partial<Owner>;
      };
      sms_settings: {
        Row: SmsSettings;
        Insert: {
          admin_id: string;
          enabled?: boolean;
          provider?: 'twilio' | 'africas-talking' | 'generic';
          sender_number?: string;
          username?: string;
          api_key_encrypted?: string;
          message_template?: string;
        };
        Update: Partial<SmsSettings>;
      };
      sms_logs: {
        Row: SmsLog;
        Insert: {
          admin_id: string;
          recipient: string;
          message: string;
          status?: 'pending' | 'sent' | 'failed';
          type?: 'manual' | 'automated' | 'payment' | 'expiry';
          error_message?: string;
        };
        Update: Partial<SmsLog>;
      };
      owner_payment_settings: {
        Row: OwnerPaymentSettings;
        Insert: {
          owner_id: string;
          method: 'paybill' | 'till';
          paybill_number?: string;
          account_number?: string;
          till_number?: string;
          description?: string;
          is_active?: boolean;
        };
        Update: Partial<OwnerPaymentSettings>;
      };
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      verify_credentials_secure: {
        Args: { input_username: string; input_password: string }
        Returns: {
          role: string
          credential_id: string
          owner_id: string
          admin_id: string
          must_change_password: boolean
        }[]
      }
      verify_admin_simple: {
        Args: { input_password: string; input_username: string }
        Returns: {
          role: string
          credential_id: string
          owner_id: string
          admin_id: string
          must_change_password: boolean
        }[]
      }
      create_user_session: {
        Args: { p_credential_id: string; p_role: string }
        Returns: string
      }
      validate_session: {
        Args: { p_session_token: string }
        Returns: {
          user_id: string
          role: string
          is_valid: boolean
        }[]
      }
      change_password_secure: {
        Args: { target_username: string; old_password: string; new_password: string }
        Returns: boolean
      }
      update_credential_password: {
        Args: { target_username: string; new_password: string }
        Returns: boolean
      }
      get_session_admin_id: {
        Args: never
        Returns: string
      }
      get_session_owner_id: {
        Args: never
        Returns: string
      }
      owner_account_exists: { Args: never; Returns: boolean }
      get_owner_profile_by_session: {
        Args: { session_token: string }
        Returns: Json[]
      }
      register_admin_simple: {
        Args: {
          p_username: string
          p_password: string
          p_email: string
          p_full_name: string
          p_phone: string
          p_business_name: string
          p_owner_id: string
        }
        Returns: Json[]
      }
      owner_reset_admin_password: {
        Args: { target_username: string; new_password: string }
        Returns: boolean
      }
      owner_delete_admin: {
        Args: { target_username: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
