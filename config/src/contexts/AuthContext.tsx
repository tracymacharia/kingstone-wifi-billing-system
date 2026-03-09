
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface User {
  id: string;
  username: string;
  email: string; // Keep for backward compatibility
  role: 'owner' | 'admin';
  credentialId?: string;
  adminId?: string; // Keep for backward compatibility
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (usernameOrEmail: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
  changePassword: (targetUsername: string, newPassword: string) => Promise<boolean>;
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
    console.warn('Auth cleanup error:', e);
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
    console.error('Error restoring user from storage:', error);
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
          console.log('Invalid session on reload, clearing auth state');
          sessionStorage.removeItem("kingstone_session_token");
          sessionStorage.removeItem("kingstone_user");
          setUser(null);
        } else {
          // Valid session, restore user from storage
          console.log('Valid session found, restoring user:', storedUser.username);
          setUser(storedUser);
        }
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
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
          username: sessionData.role === 'owner' ? sessionData.user_id : 'admin',
          email: sessionData.role === 'owner' ? `${sessionData.user_id}@kingstone.local` : 'admin@kingstone.local',
          role: sessionData.role as 'owner' | 'admin',
          credentialId: sessionData.credential_id,
          adminId: sessionData.role === 'admin' ? sessionData.credential_id : undefined
        };
        setUser(userData);
      }
    } catch (error) {
      console.error('Session validation error:', error);
      sessionStorage.removeItem("kingstone_session_token");
      setUser(null);
      setSession(null);
    }
    // Don't call setIsLoading(false) here since it's already handled in the useEffect
  };

  const login = async (usernameOrEmail: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      // Clean up any leftover Supabase auth state and sign out globally to prevent limbo
      cleanupAuthState();
      try { await supabase.auth.signOut({ scope: 'global' } as any); } catch (e) { /* ignore */ }
      console.log('Attempting login for user:', usernameOrEmail);
      console.log('Is email format:', usernameOrEmail.includes('@'));

      // Check if it's an email (owner login) or username (admin login)
      const isEmailLogin = usernameOrEmail.includes('@');

      if (isEmailLogin) {
        // Owner login: use secure RPC to avoid RLS issues (no direct table reads)
        console.log('Calling verify_credentials_secure with:', { input_username: usernameOrEmail, input_password: '***' });
        const { data: verifyResult, error: verifyError } = await supabase
          .rpc('verify_credentials_secure', {
            input_username: usernameOrEmail,
            input_password: password
          });

        console.log('verify_credentials_secure response:', { verifyResult, verifyError });
        
        if (verifyError || !verifyResult || verifyResult.length === 0) {
          console.log('Owner credentials verification failed:', verifyError);
          return false;
        }

        const { role, credential_id, owner_id } = verifyResult[0];
        if (role !== 'owner') {
          console.log('Role mismatch for email login');
          return false;
        }

        // Create secure session for owner
        console.log('Creating session for credential_id:', credential_id, 'role:', role, 'owner_id:', owner_id);
        const { data: sessionToken, error: sessionError } = await supabase
          .rpc('create_user_session', {
            p_user_id: owner_id,  // Pass owner_id, not credential_id!
            p_role: role
          });

        console.log('Session creation result:', { sessionToken, sessionError });

        if (sessionError || !sessionToken) {
          console.error('Owner session creation error:', sessionError);
          return false;
        }

        const userData: User = {
          id: credential_id,
          username: usernameOrEmail.split('@')[0],
          email: usernameOrEmail,
          role: 'owner',
          credentialId: credential_id
        };

        console.log('Owner login successful for:', usernameOrEmail);
        setUser(userData);
        sessionStorage.setItem("kingstone_session_token", sessionToken);
        sessionStorage.setItem("kingstone_user", JSON.stringify(userData));
        return true;
      } else {
        // Admin login - use simple credential verification (supports plain text passwords)
        const { data: credentialData, error: credError } = await supabase
          .rpc('verify_admin_simple', {
            input_username: usernameOrEmail,
            input_password: password
          });

        if (credError || !credentialData || credentialData.length === 0) {
          console.log('Admin credentials verification failed');
          return false;
        }

        const { role, credential_id, admin_id, is_first_login } = credentialData[0];

        // Create secure session for admin
        const { data: sessionToken, error: sessionError } = await supabase
          .rpc('create_user_session', {
            p_user_id: admin_id,  // Pass admin_id, not credential_id!
            p_role: role
          });

        if (sessionError || !sessionToken) {
          console.error('Admin session creation error:', sessionError);
          return false;
        }

        const userData: User = {
          id: credential_id,
          username: usernameOrEmail,
          email: `${usernameOrEmail}@kingstone.local`,
          role: role as 'owner' | 'admin',
          credentialId: credential_id,
          adminId: role === 'admin' ? admin_id : undefined
        };

        console.log('Admin login successful for:', usernameOrEmail);
        setUser(userData);
        sessionStorage.setItem("kingstone_session_token", sessionToken);
        sessionStorage.setItem("kingstone_user", JSON.stringify(userData));
        return true;
      }

    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      // Only set loading to false if we're still in the loading state
      // This prevents overriding the loading state during initialization
      setIsLoading(false);
    }
  };

  const changePassword = async (targetUsername: string, newPassword: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .rpc('update_credential_password', {
          target_username: targetUsername,
          new_password: newPassword
        });

      if (error) {
        console.error('Password change error:', error);
        return false;
      }

      return data;
    } catch (error) {
      console.error('Password change exception:', error);
      return false;
    }
  };

  const getAuthUser = async (): Promise<SupabaseUser | null> => {
    // For backward compatibility - return null since we don't use Supabase auth anymore
    return null;
  };

  const logout = async () => {
    try {
      console.log('Logging out...');
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
      console.error('Logout error:', error);
    }

    setUser(null);
    setSession(null);
    // Clear secure session token and user data
    sessionStorage.removeItem("kingstone_session_token");
    sessionStorage.removeItem("kingstone_user");
    localStorage.removeItem("kingstone_user");
    // Final cleanup and hard redirect for clean state
    cleanupAuthState();
    console.log('Logout completed');
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
