/**
 * App-wide Types and Interfaces
 * Serves as the single source of truth for the application's domain models.
 * 
 * Note: These types use snake_case to match the PostgreSQL database schema.
 * Supabase JS client will automatically map snake_case ↔ camelCase.
 */

export interface Package {
  id: string;
  name: string;
  package_type: 'hotspot' | 'pppoe' | 'static';
  duration_type: 'hours' | 'days' | 'weeks' | 'months';
  duration_value: number;
  download_speed_mbps?: number;
  upload_speed_mbps?: number;
  bandwidth_limit_mb?: number;
  price: number;
  is_active: boolean;
  admin_id: string;
  created_at: string;
}

export interface WiFiUser {
  id: string;
  admin_id: string;
  username: string;
  password?: string;
  phone_number?: string;
  package_id?: string;
  package_expires_at?: string;
  is_active: boolean;
  created_at: string;
  package?: Partial<Package>;
}

export interface BroadbandUser {
  id: string;
  admin_id: string;
  username: string;
  password: string;
  user_type: 'pppoe' | 'static';
  phone_number?: string;
  portal_token?: string;
  package_id?: string;
  package_expires_at?: string;
  bandwidth_used_mb?: number;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  package?: Partial<Package>;
}

export interface Mikrotik {
  id: string;
  name: string;
  router_id?: string;
  ip_address?: string;
  api_port?: number;
  username: string;
  password_encrypted?: string;
  admin_id: string;
  status: 'online' | 'offline';
  mpesa_type?: 'till' | 'paybill';
  mpesa_number?: string;
  location?: string;
  total_earnings?: number;
  active_users?: number;
  created_at: string;
}

export interface Payment {
  id: string;
  admin_id: string;
  user_phone?: string;
  amount: number;
  package_name?: string;
  status: 'completed' | 'pending' | 'failed';
  receipt_number?: string;
  created_at: string;
}

export interface Admin {
  id: string;
  owner_id: string;
  email: string;
  username: string;
  full_name: string;
  business_name?: string;
  phone?: string;
  is_active: boolean;
  profile_picture?: string;
  created_at: string;
}

export interface Owner {
  id: string;
  profile_id: string;
  business_name: string;
  subscription_status: string;
  is_trial: boolean;
  created_at: string;
}

export interface SmsSettings {
  id: string;
  admin_id: string;
  enabled: boolean;
  provider: 'twilio' | 'africas-talking' | 'generic';
  sender_number?: string;
  username?: string;
  api_key_encrypted?: string;
  message_template?: string;
  created_at: string;
  updated_at: string;
}

export interface SmsLog {
  id: string;
  admin_id: string;
  recipient: string;
  message: string;
  status: 'pending' | 'sent' | 'failed';
  type: 'manual' | 'automated' | 'payment' | 'expiry';
  error_message?: string;
  created_at: string;
}

export interface OwnerPaymentSettings {
  id: string;
  owner_id: string;
  method: 'paybill' | 'till';
  paybill_number?: string;
  account_number?: string;
  till_number?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
