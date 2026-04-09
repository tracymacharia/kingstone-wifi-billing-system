
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { logger } from "@/lib/logger";

interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin';
  credentialId?: string;
  adminId?: string;
  isFirstLogin?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (usernameOrEmail: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
  changePassword: (targetUsername: string, newPassword: string, oldPassword?: string) => Promise<boolean>;
  getAuthUser: () => Promise<SupabaseUser | null>; // Keep for backward compatibility
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

const cleanupAuthState = () => {
  try {
    // Remove Supabase auth artifacts to prevent limbo states
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    Object.keys(sessionStorage || {}).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (e) {
    logger.warn('Auth cleanup error:', e);
  }
};

// Restore user from sessionStorage
const restoreUserFromStorage = (): User | null => {
  try {
    const storedUser = sessionStorage.getItem("kingstone_user");
    if (storedUser) {
      return JSON.parse(storedUser);
    }
  } catch (error) {
    logger.error('Error restoring user from storage:', error);
  }
  return null;
};

// Initialize auth state on component mount
useEffect(() => {
  const initializeAuth = async () => {
    try {
      // Check for existing secure session token and stored user
      const sessionToken = sessionStorage.getItem("kingstone_session_token");
      const storedUser = restoreUserFromStorage();

      if (sessionToken && storedUser) {
        // Validate session token first
        const { data, error } = await supabase
          .rpc('validate_session', { p_session_token: sessionToken });

        if (error || !data || data.length === 0) {
          // Invalid session, clear everything
          sessionStorage.removeItem("kingstone_session_token");
          sessionStorage.removeItem("kingstone_user");
          setUser(null);
        } else {
          // Valid session, restore user from storage
          setUser(storedUser);
        }
      }
    } catch (error) {
      logger.error('Error initializing auth:', error);
      // Clear any invalid session token
      sessionStorage.removeItem("kingstone_session_token");
      sessionStorage.removeItem("kingstone_user");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  initializeAuth();
}, []);

  const validateSessionToken = async (token: string) => {
    try {
      const { data, error } = await supabase
        .rpc('validate_session', { p_session_token: token });

      if (error || !data || data.length === 0) {
        // Invalid session, clear token
        sessionStorage.removeItem("kingstone_session_token");
        setUser(null);
        setSession(null);
      } else {
        // Valid session, restore user data
        const sessionData = data[0];
        const userData: User = {
          id: sessionData.credential_id,
          username: 'admin',
          email: 'admin@kingstone.local',
          role: 'admin',
          credentialId: sessionData.credential_id,
          adminId: sessionData.credential_id
        };
        setUser(userData);
      }
    } catch (error) {
      logger.error('Session validation error:', error);
      sessionStorage.removeItem("kingstone_session_token");
      setUser(null);
      setSession(null);
    }
    // Don't call setIsLoading(false) here since it's already handled in the useEffect
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      // Clean up any leftover Supabase auth state and sign out globally to prevent limbo
      cleanupAuthState();
      try { await supabase.auth.signOut({ scope: 'global' } as any); } catch (e) { /* ignore */ }

      // Admin login: Query system_credentials directly
      const { data: credData, error: credError } = await supabase
        .from('system_credentials')
        .select('id, admin_id, role')
        .eq('username', username)
        .eq('role', 'admin')
        .maybeSingle();

      if (credError || !credData) {
        logger.error('Admin not found:', credError?.message);
        setIsLoading(false);
        return false;
      }

      // Create session
      const { data: sessionToken, error: sessionError } = await supabase
        .rpc('create_user_session', {
          p_credential_id: credData.id,
          p_role: 'admin'
        });

      if (sessionError || !sessionToken) {
        logger.error('Session creation error:', sessionError);
        setIsLoading(false);
        return false;
      }

      const userData: User = {
        id: credData.id,
        username: username,
        email: 'admin@kingstone.local',
        role: 'admin',
        credentialId: credData.id,
        adminId: credData.admin_id
      };

      setUser(userData);
      sessionStorage.setItem("kingstone_session_token", sessionToken);
      sessionStorage.setItem("kingstone_user", JSON.stringify(userData));
      return true;

    } catch (error) {
      logger.error('Login error:', error);
      return false;
    } finally {
      // Only set loading to false if we're still in the loading state
      // This prevents overriding the loading state during initialization
      setIsLoading(false);
    }
  };

  const changePassword = async (targetUsername: string, newPassword: string, oldPassword?: string): Promise<boolean> => {
    try {
      // Try the new secure function first (with old password verification)
      if (oldPassword) {
        const { data, error } = await supabase
          .rpc('change_password_secure', {
            target_username: targetUsername,
            old_password: oldPassword,
            new_password: newPassword
          });

        if (error) {
          logger.error('Password change error:', error);
          // The error message from the function will be descriptive
          throw error;
        }

        return data;
      } else {
        // Fallback to old function (for first-login password changes where old password is not required)
        const { data, error } = await supabase
          .rpc('update_credential_password', {
            target_username: targetUsername,
            new_password: newPassword
          });

        if (error) {
          logger.error('Password change error:', error);
          return false;
        }

        return data;
      }
    } catch (error: any) {
      logger.error('Password change exception:', error);
      // Re-throw to let the caller handle the specific error message
      throw error;
    }
  };

  const getAuthUser = async (): Promise<SupabaseUser | null> => {
    // For backward compatibility - return null since we don't use Supabase auth anymore
    return null;
  };

  const logout = async () => {
    try {
      // Clean up auth artifacts first
      cleanupAuthState();
      // Invalidate session token in DB
      const sessionToken = sessionStorage.getItem("kingstone_session_token");
      if (sessionToken) {
        await supabase
          .from('user_sessions')
          .update({ is_active: false })
          .eq('session_token', sessionToken);
      }
      // Global sign out to clear all Supabase sessions
      try { await supabase.auth.signOut({ scope: 'global' } as any); } catch (e) { /* ignore */ }
    } catch (error) {
      logger.error('Logout error:', error);
    }

    setUser(null);
    setSession(null);
    // Clear secure session token and user data
    sessionStorage.removeItem("kingstone_session_token");
    sessionStorage.removeItem("kingstone_user");
    localStorage.removeItem("kingstone_user");
    // Final cleanup and hard redirect for clean state
    cleanupAuthState();
    window.location.href = '/auth';
  };

  return (
    <AuthContext.Provider value={{ user, session, login, logout, isLoading, changePassword, getAuthUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
