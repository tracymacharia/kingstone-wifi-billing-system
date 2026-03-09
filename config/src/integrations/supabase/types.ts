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
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      verify_credentials_secure: {
        Args: { input_password: string; input_username: string }
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
          is_first_login: boolean
        }[]
      }
      create_user_session: {
        Args: { p_user_id: string; p_role: string; p_duration?: number }
        Returns: string
      }
      owner_account_exists: { Args: never; Returns: boolean }
      register_owner: {
        Args: {
          p_email: string
          p_full_name: string
          p_password: string
          p_phone_number: string
          p_otp: string
        }
        Returns: Json[]
      }
      request_registration_otp: {
        Args: { p_email: string; p_full_name: string }
        Returns: Json
      }
      validate_otp: {
        Args: { p_email: string; p_otp: string }
        Returns: Json
      }
      register_admin: {
        Args: {
          p_full_name: string
          p_email: string
          p_phone: string
          p_business_name: string
          p_username: string
          p_password: string
          p_owner_id: string
          p_subscription_type: string
          p_otp?: string
        }
        Returns: Json[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
