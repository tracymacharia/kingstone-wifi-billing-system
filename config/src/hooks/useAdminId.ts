import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useRPC } from './useRPC';

/**
 * Enhanced hook to get the current admin ID for database operations
 * Now uses the RPC system for better performance and consistency
 */
export const useAdminId = () => {
  const { user } = useAuth();
  const { call } = useRPC();
  
  // For admin users, use their credential ID
  // For owner users, return the admin credential ID from the system
  const getAdminId = async (): Promise<string | null> => {
    if (user?.role === 'admin') {
      return user.credentialId || user.id;
    }
    
    if (user?.role === 'owner') {
      // Use RPC to get admin credential ID more efficiently
      try {
        const result = await call({
          method: 'getSystemHealth',
          params: {}
        });
        
        if (result.success) {
          // If we can call owner methods, we have access to admin operations
          const { data } = await supabase
            .from('system_credentials')
            .select('id')
            .eq('username', 'admin')
            .single();
          
          return data?.id || null;
        }
        
        return null;
      } catch (error) {
        console.error('Error getting admin ID:', error);
        return null;
      }
    }
    
    return null;
  };

  // Synchronous admin ID for immediate use
  const adminId = user?.role === 'admin' ? (user.credentialId || user.id) : null;

  // Enhanced role checking
  const hasAdminAccess = user?.role === 'admin' || user?.role === 'owner';
  const hasOwnerAccess = user?.role === 'owner';

  return {
    adminId,
    getAdminId,
    isAdmin: user?.role === 'admin',
    isOwner: user?.role === 'owner',
    hasAdminAccess,
    hasOwnerAccess,
    userRole: user?.role || null
  };
};

/**
 * Get admin ID synchronously for components that already have the user context
 */
export const getAdminIdFromUser = (user: any): string | null => {
  if (!user) return null;
  
  if (user.role === 'admin') {
    return user.credentialId || user.id;
  }
  
  return null;
};